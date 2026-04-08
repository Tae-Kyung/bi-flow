-- contract_spaces에 호실별 금액 컬럼 추가
-- 1기업이 여러 호실 계약 시 호실별 월 임대료/보증금을 개별 저장
ALTER TABLE contract_spaces
  ADD COLUMN rent_amount NUMERIC(12,0) NOT NULL DEFAULT 0,
  ADD COLUMN deposit     NUMERIC(12,0) NOT NULL DEFAULT 0;
