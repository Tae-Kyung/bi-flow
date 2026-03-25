-- active 상태의 계약에서 동일 space_id 중복 방지
-- 하나의 호실은 한 번에 하나의 active 계약에만 속할 수 있음
CREATE UNIQUE INDEX unique_active_space_contract
ON contracts(space_id) WHERE status = 'active';
