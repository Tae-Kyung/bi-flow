-- ============================================
-- Datafield.md 표준 필드 반영: 기업 확장 정보
-- ============================================

-- 1. 기업 기본 정보
ALTER TABLE companies ADD COLUMN IF NOT EXISTS corporate_type TEXT;            -- 법인/개인/예비창업자
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founding_date DATE;             -- 설립일
ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_description TEXT;      -- 주요 사업내용 (업태/종목)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS main_products TEXT;             -- 주생산품
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT;                   -- 홈페이지

-- 2. 담당자 및 연락처
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_name TEXT;              -- 실무담당자 성명
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_phone TEXT;             -- 실무담당자 연락처
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_email TEXT;             -- 실무담당자 이메일
ALTER TABLE companies ADD COLUMN IF NOT EXISTS office_phone TEXT;              -- 사무실 전화번호
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fax TEXT;                       -- 팩스

-- 3. 인증 및 특이사항
ALTER TABLE companies ADD COLUMN IF NOT EXISTS certification_expiry DATE;      -- 인증 만료일 (벤처기업 등)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notes TEXT;                     -- 비고
