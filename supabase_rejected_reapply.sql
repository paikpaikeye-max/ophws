-- ========================================================
-- rejected 사용자 재신청 기능을 위한 RLS 정책 추가
-- Supabase SQL Editor에 복사하여 실행해 주세요.
-- ========================================================

-- 사용자가 자신의 프로필(rejected 상태)을 삭제할 수 있도록 허용
CREATE POLICY "Users can delete own profile"
    ON public.user_profiles FOR DELETE
    USING (auth.uid() = id);
