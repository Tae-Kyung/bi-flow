-- ============================================
-- BI-Flow 초기 스키마
-- ============================================

-- Enum 타입 생성
CREATE TYPE org_type AS ENUM ('bi_center', 'g_tech', 'convergence');
CREATE TYPE user_role AS ENUM ('super_admin', 'org_admin', 'tenant');
CREATE TYPE space_status AS ENUM ('vacant', 'occupied');
CREATE TYPE company_status AS ENUM ('active', 'graduated', 'terminated');
CREATE TYPE contract_status AS ENUM ('draft', 'active', 'expired', 'terminated');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'overdue');
CREATE TYPE document_type AS ENUM ('biz_license', 'biz_plan', 'contract', 'other');
CREATE TYPE payment_method AS ENUM ('bank_transfer', 'virtual_account', 'other');
CREATE TYPE application_status AS ENUM ('submitted', 'reviewing', 'approved', 'rejected');

-- ============================================
-- 1. organizations (기관)
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type org_type NOT NULL,
  settings JSONB NOT NULL DEFAULT '{
    "rent_unit_price": 0,
    "maintenance_fee_total": 0,
    "distribution_method": "area_ratio",
    "invoice_issue_day": 1
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. profiles (사용자 프로필)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'tenant',
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  company_id UUID, -- FK는 companies 생성 후 추가
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. spaces (공간/호실)
-- ============================================
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status space_status NOT NULL DEFAULT 'vacant',
  floor TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. companies (입주기업)
-- ============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  biz_number TEXT NOT NULL DEFAULT '',
  representative TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  address TEXT,
  status company_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- profiles.company_id FK 추가
ALTER TABLE profiles
  ADD CONSTRAINT profiles_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- ============================================
-- 5. contracts (계약)
-- ============================================
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
  deposit NUMERIC(12, 0) NOT NULL DEFAULT 0,
  status contract_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 6. documents (서류)
-- ============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type document_type NOT NULL DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 7. invoices (고지서)
-- ============================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL, -- YYYY-MM
  rent NUMERIC(12, 0) NOT NULL DEFAULT 0,
  maintenance_fee NUMERIC(12, 0) NOT NULL DEFAULT 0,
  extra_charges JSONB,
  total NUMERIC(12, 0) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 8. payments (수납)
-- ============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
  method payment_method NOT NULL DEFAULT 'bank_transfer',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX idx_profiles_org_id ON profiles(org_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_spaces_org_id ON spaces(org_id);
CREATE INDEX idx_spaces_status ON spaces(status);
CREATE INDEX idx_companies_org_id ON companies(org_id);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_contracts_org_id ON contracts(org_id);
CREATE INDEX idx_contracts_company_id ON contracts(company_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_invoices_org_id ON invoices(org_id);
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_year_month ON invoices(year_month);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);

-- ============================================
-- updated_at 자동 갱신 트리거
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_spaces_updated_at
  BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Auth → profiles 자동 생성 트리거
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'tenant')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- RLS 활성화 및 정책
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- profiles 정책
CREATE POLICY "프로필 본인 조회" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super Admin 전체 프로필 조회" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Org Admin 소속 기관 프로필 조회" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'org_admin'
        AND p.org_id = profiles.org_id
    )
  );

CREATE POLICY "Super Admin 프로필 수정" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- organizations 정책
CREATE POLICY "인증된 사용자 기관 조회" ON organizations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super Admin 기관 관리" ON organizations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- spaces 정책
CREATE POLICY "Super Admin 공간 전체 접근" ON spaces
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Org Admin 소속 기관 공간 접근" ON spaces
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'org_admin' AND org_id = spaces.org_id
    )
  );

CREATE POLICY "Tenant 소속 기관 공간 조회" ON spaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'tenant' AND org_id = spaces.org_id
    )
  );

-- companies 정책
CREATE POLICY "Super Admin 기업 전체 접근" ON companies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Org Admin 소속 기관 기업 접근" ON companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'org_admin' AND org_id = companies.org_id
    )
  );

CREATE POLICY "Tenant 본인 기업 조회" ON companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'tenant' AND company_id = companies.id
    )
  );

-- contracts 정책
CREATE POLICY "Super Admin 계약 전체 접근" ON contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Org Admin 소속 기관 계약 접근" ON contracts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'org_admin' AND org_id = contracts.org_id
    )
  );

CREATE POLICY "Tenant 본인 기업 계약 조회" ON contracts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'tenant' AND company_id = contracts.company_id
    )
  );

-- documents 정책
CREATE POLICY "Super Admin 문서 전체 접근" ON documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Org Admin 소속 기관 문서 접근" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'org_admin' AND org_id = documents.org_id
    )
  );

CREATE POLICY "Tenant 본인 기업 문서 접근" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'tenant' AND company_id = documents.company_id
    )
  );

-- invoices 정책
CREATE POLICY "Super Admin 고지서 전체 접근" ON invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Org Admin 소속 기관 고지서 접근" ON invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'org_admin' AND org_id = invoices.org_id
    )
  );

CREATE POLICY "Tenant 본인 기업 고지서 조회" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'tenant' AND company_id = invoices.company_id
    )
  );

-- payments 정책
CREATE POLICY "Super Admin 수납 전체 접근" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Org Admin 소속 기관 수납 접근" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN invoices i ON i.id = payments.invoice_id
      WHERE p.id = auth.uid() AND p.role = 'org_admin' AND p.org_id = i.org_id
    )
  );

CREATE POLICY "Tenant 본인 기업 수납 조회" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN invoices i ON i.id = payments.invoice_id
      WHERE p.id = auth.uid() AND p.role = 'tenant' AND p.company_id = i.company_id
    )
  );
