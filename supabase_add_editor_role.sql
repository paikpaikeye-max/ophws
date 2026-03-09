-- ========================================================
-- editor 권한 추가 SQL
-- Supabase SQL Editor에 복사하여 실행해 주세요.
-- ========================================================

-- 1. status 컬럼의 CHECK 제약 조건 삭제 후 재생성 (editor 추가)
ALTER TABLE public.user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_status_check;

ALTER TABLE public.user_profiles 
  ADD CONSTRAINT user_profiles_status_check 
  CHECK (status IN ('pending', 'approved', 'editor', 'rejected', 'admin'));
