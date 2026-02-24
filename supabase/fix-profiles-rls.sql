-- =============================================
-- 1단계: profiles RLS 무한재귀 수정
-- =============================================

-- 기존 profiles 정책 모두 삭제 (한글 이름 포함)
DROP POLICY IF EXISTS "프로필 본인 조회" ON profiles;
DROP POLICY IF EXISTS "Super Admin 전체 프로필 조회" ON profiles;
DROP POLICY IF EXISTS "Org Admin 소속 기관 프로필 조회" ON profiles;
DROP POLICY IF EXISTS "Super Admin 프로필 수정" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

-- RLS를 우회하여 역할을 가져오는 SECURITY DEFINER 함수
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid()
$$;

-- RLS를 우회하여 소속 기관 ID를 가져오는 함수
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$;

-- profiles RLS 정책 재생성 (재귀 없음)
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    auth.uid() = id
    OR public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'org_admin' AND org_id = public.get_my_org_id())
  );

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR public.get_my_role() = 'super_admin'
  );

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (
    public.get_my_role() = 'super_admin'
  );

-- =============================================
-- 2단계: 기존 admin 계정 프로필 확인/수정
-- admin@cbnu.ac.kr → super_admin 역할 보장
-- =============================================
UPDATE profiles
SET role = 'super_admin', name = 'Super Admin'
WHERE email = 'admin@cbnu.ac.kr';

-- 만약 profiles에 레코드가 없다면 생성
INSERT INTO profiles (id, email, name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'name', 'Super Admin'), 'super_admin'
FROM auth.users
WHERE email = 'admin@cbnu.ac.kr'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@cbnu.ac.kr')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 3단계: handle_new_user 트리거에 org_id 지원 추가
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, org_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'tenant'),
    (NEW.raw_user_meta_data->>'org_id')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- 4단계: organizations 비인증 사용자 SELECT 허용
-- 회원가입 페이지에서 기관 목록을 조회하기 위해 필요
-- =============================================
DROP POLICY IF EXISTS "비인증 사용자 기관 조회" ON organizations;
CREATE POLICY "비인증 사용자 기관 조회" ON organizations
  FOR SELECT USING (true);
