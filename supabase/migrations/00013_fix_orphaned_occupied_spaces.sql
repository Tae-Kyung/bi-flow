-- occupied 상태이지만 active 계약에 배정되지 않은 고아 호실을 vacant으로 복구
-- (migration 00012에서 중복 계약을 terminated 처리했지만 spaces.status는 변경되지 않아 발생)
UPDATE spaces
SET status = 'vacant'
WHERE status = 'occupied'
  AND id NOT IN (
    SELECT cs.space_id
    FROM contract_spaces cs
    JOIN contracts c ON c.id = cs.contract_id
    WHERE c.status = 'active'
  );
