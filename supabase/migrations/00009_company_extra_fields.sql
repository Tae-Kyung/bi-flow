-- Add move_in_date and extra_contacts to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS move_in_date DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS extra_contacts JSONB DEFAULT '[]'::jsonb;
