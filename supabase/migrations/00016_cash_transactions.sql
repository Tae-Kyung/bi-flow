-- ============================================
-- 현금 입출금 내역 테이블 (현금출납부 업로드)
-- ============================================

CREATE TABLE cash_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 원본 필드
  seq_no        INTEGER,
  approved_at   DATE,
  approval_no   TEXT,
  acct_code     TEXT,
  acct_name     TEXT,
  acct_ref      TEXT,
  deposit       BIGINT NOT NULL DEFAULT 0,    -- 입금액 (원)
  withdrawal    BIGINT NOT NULL DEFAULT 0,    -- 출금액 (원)
  balance       BIGINT NOT NULL DEFAULT 0,    -- 잔액
  description   TEXT,                         -- 적요
  budget_item   TEXT,                         -- 예산항목
  billing_type  TEXT,                         -- 청구유형

  -- 파생 분류 (파싱 시 결정)
  expense_category  TEXT,  -- 인건비|회의비|여비|운영비|연구수당|기업지원비|시설보수비|집기비품|부가세|보증금|기타
  income_category   TEXT,  -- 임대료|VAT|전입금|이자수익|보증금수취|기타수익

  -- 업로드 메타
  file_name     TEXT,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cash_org_date ON cash_transactions(org_id, approved_at);
CREATE INDEX idx_cash_org_expense ON cash_transactions(org_id, expense_category);
CREATE INDEX idx_cash_org_income ON cash_transactions(org_id, income_category);

-- RLS
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_cash" ON cash_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "org_admin_own_cash" ON cash_transactions
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid() AND role = 'org_admin'
    )
  );
