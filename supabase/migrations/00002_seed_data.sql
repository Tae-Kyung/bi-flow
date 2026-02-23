-- ============================================
-- 시드 데이터: 3개 기관
-- ============================================
INSERT INTO organizations (name, type, settings) VALUES
(
  '창업보육센터',
  'bi_center',
  '{"rent_unit_price": 15000, "maintenance_fee_total": 3000000, "distribution_method": "area_ratio", "invoice_issue_day": 1}'::jsonb
),
(
  'G-테크벤처센터',
  'g_tech',
  '{"rent_unit_price": 18000, "maintenance_fee_total": 2500000, "distribution_method": "area_ratio", "invoice_issue_day": 1}'::jsonb
),
(
  '융합기술원',
  'convergence',
  '{"rent_unit_price": 12000, "maintenance_fee_total": 2000000, "distribution_method": "equal", "invoice_issue_day": 1}'::jsonb
);
