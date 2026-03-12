-- ========================================================
-- assistant_global_config 테이블의 admin 전용 수정/삽입 권한 (무한 재귀 해결버전)
-- Supabase SQL Editor에 복사하여 실행해 주세요.
-- ========================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can update global config" ON public.assistant_global_config;
DROP POLICY IF EXISTS "Admins can insert global config" ON public.assistant_global_config;

-- 새 정책 추가 (이전에 생성한 public.is_admin() 함수 활용)
CREATE POLICY "Admins can update global config"
    ON public.assistant_global_config FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Admins can insert global config"
    ON public.assistant_global_config FOR INSERT
    WITH CHECK (public.is_admin());
