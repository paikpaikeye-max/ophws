-- ========================================================
-- OPHWS 사용자 관리 테이블 및 권한 설정 (Supabase SQL)
-- ========================================================

-- 1. user_profiles 테이블 생성 (auth.users와 연동)
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    department TEXT,
    employee_id TEXT,
    memo TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Row Level Security 활성화 
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. 권한 정책 생성 (Policy)

-- Policy 1: 누구나 자신의 프로필 생성 가능 (가입 신청)
CREATE POLICY "Users can insert their own profile"
    ON public.user_profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Policy 2: 누구나 자신의 프로필 조회 가능
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Policy 3: 'admin' 권한을 가진 사용자는 모든 사람의 프로필을 볼 수 있음
CREATE POLICY "Admins can view all profiles"
    ON public.user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND status = 'admin'
        )
    );

-- Policy 4: 'admin' 권한을 가진 사용자는 다른 사람의 프로필(승인 상태) 수정 가능
CREATE POLICY "Admins can update all profiles"
    ON public.user_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND status = 'admin'
        )
    );

-- 참고: 가장 처음 원장님(본인)을 관리자로 만드시려면, 회원가입 후 
--     Supabase 대시보드의 Table Editor에서 본인의 status를 수동으로 'admin'으로 변경하셔야 합니다.
