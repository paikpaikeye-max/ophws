-- ========================================================
-- 가입 신청 필드 추가 및 DELETE 정책 설정
-- ========================================================

-- 1. 새로운 컬럼 추가 (자기소개, 연락처)
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS introduction TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS contact TEXT;

-- 2. DELETE RLS 정책 설정

-- (1) 관리자의 모든 프로필 삭제 권한
-- 기존 정책이 있다면 삭제 후 재생성 (is_admin() 함수가 이미 존재한다고 가정)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;
CREATE POLICY "Admins can delete profiles"
    ON public.user_profiles FOR DELETE
    USING (public.is_admin());

-- (2) 사용자 본인의 프로필 삭제 권한 (거절 후 재신청 시 필요)
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
CREATE POLICY "Users can delete own profile"
    ON public.user_profiles FOR DELETE
    USING (auth.uid() = id);

-- 3. (참고) UPDATE 정책 보완 (이미 존재할 수 있음)
-- 사용자가 자신의 프로필을 직접 'pending' 상태로 되돌리는 것을 허용하려면 필요할 수 있으나,
-- 여기서는 삭제 후 재가입 방식을 권장하므로 DELETE 정책만으로도 재신청 에러(USING)를 해결할 수 있습니다.
