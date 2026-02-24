-- ============================================
-- 졸업 기업 관리 필드 추가
-- ============================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS graduation_notes TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS graduated_at TIMESTAMPTZ;
