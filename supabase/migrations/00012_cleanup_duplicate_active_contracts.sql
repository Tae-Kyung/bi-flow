-- 기업당 active 계약이 여러 개인 경우, 가장 최근 생성된 것만 남기고 나머지를 terminated 처리
-- (contract_spaces는 CASCADE로 유지되므로 호실 상태는 건드리지 않음)
WITH ranked AS (
  SELECT
    id,
    company_id,
    ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at DESC) AS rn
  FROM contracts
  WHERE status = 'active'
)
UPDATE contracts
SET status = 'terminated'
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);
