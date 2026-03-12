-- ========================================================
-- OPHWS 사용자 자신의 프로필 수정 권한(RLS) 추가
-- Supabase SQL Editor에 복사하여 실행해 주세요.
-- ========================================================

-- 자기 자신의 프로필(assistant_config 등)을 업데이트할 수 있는 권한 추가
CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);
