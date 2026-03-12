-- ========================================================
-- 진료도우미 설정 저장 테이블 및 RLS 설정
-- Supabase SQL Editor에서 실행해 주세요.
-- ========================================================

-- 1. 전역 설정 테이블 생성 (관리자가 관리, 단일 레코드)
CREATE TABLE public.assistant_global_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INTEGER DEFAULT 1,
    config JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- RLS 활성화
ALTER TABLE public.assistant_global_config ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 읽기 가능
CREATE POLICY "Authenticated users can read global config"
    ON public.assistant_global_config FOR SELECT
    USING (auth.role() = 'authenticated');

-- admin만 업데이트 가능
CREATE POLICY "Admins can update global config"
    ON public.assistant_global_config FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND status = 'admin'
        )
    );

-- admin만 삽입 가능
CREATE POLICY "Admins can insert global config"
    ON public.assistant_global_config FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND status = 'admin'
        )
    );

-- 2. user_profiles에 assistant_config 컬럼 추가
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS assistant_config JSONB DEFAULT '{}';

-- 3. 사용자가 자신의 프로필을 업데이트할 수 있는 정책 추가
--    (기존에 자기 프로필 UPDATE 정책이 없으므로 추가)
CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
