-- 계약 연장(Renewal) 지원을 위한 previous_contract_id 컬럼 추가
ALTER TABLE contracts
  ADD COLUMN previous_contract_id UUID REFERENCES contracts(id);

CREATE INDEX idx_contracts_previous_contract_id
  ON contracts(previous_contract_id);
