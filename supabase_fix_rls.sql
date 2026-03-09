-- ========================================================
-- RLS 무한 재귀 오류 수정 SQL
-- Supabase SQL Editor에 복사하여 실행해 주세요.
-- ========================================================

-- 1. 기존 문제가 되는 정책들 삭제
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;

-- 2. SECURITY DEFINER 함수 생성 (RLS를 우회하여 admin 여부 확인)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND status = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. 새로운 정책 생성 (무한 재귀 없음)
CREATE POLICY "Admins can view all profiles"
    ON public.user_profiles FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
    ON public.user_profiles FOR UPDATE
    USING (public.is_admin());
