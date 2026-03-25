-- contract_spaces 중간 테이블: 계약(1) ↔ 호실(N) 다대다 관계
CREATE TABLE contract_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contract_id, space_id)
);

-- 트리거: 동일 호실이 여러 active 계약에 중복 배정되는 것을 방지
CREATE OR REPLACE FUNCTION check_space_not_in_active_contract()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM contract_spaces cs
    JOIN contracts c ON c.id = cs.contract_id
    WHERE cs.space_id = NEW.space_id
      AND c.status = 'active'
      AND cs.contract_id != NEW.contract_id
  ) THEN
    RAISE EXCEPTION 'Space is already assigned to an active contract';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_space_not_in_active_contract
BEFORE INSERT OR UPDATE ON contract_spaces
FOR EACH ROW EXECUTE FUNCTION check_space_not_in_active_contract();

-- 기존 contracts.space_id 데이터를 contract_spaces로 마이그레이션
INSERT INTO contract_spaces (contract_id, space_id)
SELECT id, space_id FROM contracts WHERE space_id IS NOT NULL;

-- contracts.space_id 를 nullable로 변경 (레거시 컬럼 유지, 추후 삭제 가능)
ALTER TABLE contracts ALTER COLUMN space_id DROP NOT NULL;

-- 기존 unique 인덱스 제거 (contract_spaces 트리거로 대체)
DROP INDEX IF EXISTS unique_active_space_contract;

-- RLS 정책 추가
ALTER TABLE contract_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin contract_spaces 전체 접근" ON contract_spaces
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Org Admin 소속 기관 contract_spaces 접근" ON contract_spaces
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN contracts c ON c.id = contract_spaces.contract_id
      WHERE p.id = auth.uid() AND p.role = 'org_admin' AND p.org_id = c.org_id
    )
  );

CREATE POLICY "Tenant 본인 기업 contract_spaces 조회" ON contract_spaces
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN contracts c ON c.id = contract_spaces.contract_id
      WHERE p.id = auth.uid() AND p.role = 'tenant' AND p.company_id = c.company_id
    )
  );
