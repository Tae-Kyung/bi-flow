-- contract_spaces 테이블에 공간별 이용기간 컬럼 추가
ALTER TABLE contract_spaces
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;
