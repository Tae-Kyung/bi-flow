-- ============================================
-- Phase 2: 입주 신청, 퇴거, 알림 테이블
-- ============================================

-- 1. applications (입주 신청)
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  biz_number TEXT NOT NULL DEFAULT '',
  representative TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  desired_area NUMERIC(10, 2),
  desired_period TEXT,
  purpose TEXT,
  status application_status NOT NULL DEFAULT 'submitted',
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_applications_org_id ON applications(org_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_applicant_id ON applications(applicant_id);

-- 2. move_outs (퇴거)
CREATE TYPE move_out_status AS ENUM ('requested', 'inspecting', 'settling', 'completed');

CREATE TABLE move_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exit_date DATE,
  status move_out_status NOT NULL DEFAULT 'requested',
  reason TEXT,
  inspection_notes TEXT,
  inspection_completed_at TIMESTAMPTZ,
  deposit_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
  deposit_deduction NUMERIC(12, 0) NOT NULL DEFAULT 0,
  deduction_reason TEXT,
  deposit_returned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_move_outs_org_id ON move_outs(org_id);
CREATE INDEX idx_move_outs_company_id ON move_outs(company_id);
CREATE INDEX idx_move_outs_status ON move_outs(status);

CREATE TRIGGER trg_move_outs_updated_at
  BEFORE UPDATE ON move_outs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. notifications (알림)
CREATE TYPE notification_type AS ENUM (
  'application_submitted',
  'application_approved',
  'application_rejected',
  'contract_expiring',
  'move_out_requested',
  'move_out_completed',
  'general'
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================
-- RLS 정책
-- ============================================

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- applications 정책
CREATE POLICY "Super Admin 신청 전체 접근" ON applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Org Admin 소속 기관 신청 접근" ON applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'org_admin' AND org_id = applications.org_id
    )
  );

CREATE POLICY "Tenant 본인 신청 조회" ON applications
  FOR SELECT USING (applicant_id = auth.uid());

CREATE POLICY "Tenant 신청 생성" ON applications
  FOR INSERT WITH CHECK (applicant_id = auth.uid());

-- move_outs 정책
CREATE POLICY "Super Admin 퇴거 전체 접근" ON move_outs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Org Admin 소속 기관 퇴거 접근" ON move_outs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'org_admin' AND org_id = move_outs.org_id
    )
  );

CREATE POLICY "Tenant 본인 기업 퇴거 조회" ON move_outs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'tenant' AND company_id = move_outs.company_id
    )
  );

-- notifications 정책
CREATE POLICY "본인 알림 조회" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "본인 알림 수정" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "인증 사용자 알림 생성" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
