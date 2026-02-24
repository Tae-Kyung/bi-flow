export type UserRole = "super_admin" | "org_admin" | "tenant";

export type OrgType = "bi_center" | "g_tech" | "convergence";

export type SpaceStatus = "vacant" | "occupied";

export type CompanyStatus = "active" | "graduated" | "terminated";

export type ContractStatus = "draft" | "active" | "expired" | "terminated";

export type InvoiceStatus = "draft" | "issued" | "paid" | "overdue";

export type DocumentType =
  | "biz_license"
  | "biz_plan"
  | "contract"
  | "other";

export type PaymentMethod = "bank_transfer" | "virtual_account" | "other";

export type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "approved"
  | "rejected";

export type MoveOutStatus =
  | "requested"
  | "inspecting"
  | "settling"
  | "completed";

export type NotificationType =
  | "application_submitted"
  | "application_approved"
  | "application_rejected"
  | "contract_expiring"
  | "move_out_requested"
  | "move_out_completed"
  | "general";

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  settings: OrgSettings;
  created_at: string;
  updated_at: string;
}

export interface OrgSettings {
  rent_unit_price: number;
  maintenance_fee_total: number;
  distribution_method: "area_ratio" | "equal" | "custom";
  invoice_issue_day: number;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  org_id: string | null;
  company_id: string | null;
  created_at: string;
}

export interface Space {
  id: string;
  org_id: string;
  name: string;
  area: number;
  status: SpaceStatus;
  floor: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  organization?: Organization;
}

export interface Company {
  id: string;
  org_id: string;
  name: string;
  biz_number: string;
  representative: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: CompanyStatus;
  graduation_notes: string | null;
  graduated_at: string | null;
  created_at: string;
  updated_at: string;
  organization?: Organization;
}

export interface Contract {
  id: string;
  company_id: string;
  space_id: string;
  org_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit: number;
  previous_contract_id: string | null;
  status: ContractStatus;
  created_at: string;
  updated_at: string;
  company?: Company;
  space?: Space;
}

export interface Document {
  id: string;
  company_id: string;
  org_id: string;
  type: DocumentType;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  org_id: string;
  contract_id: string;
  year_month: string;
  rent: number;
  maintenance_fee: number;
  extra_charges: Record<string, number> | null;
  total: number;
  due_date: string;
  status: InvoiceStatus;
  issued_at: string | null;
  paid_at: string | null;
  created_at: string;
  company?: Company;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at: string;
  confirmed_by: string;
  note: string | null;
  created_at: string;
}

export interface Application {
  id: string;
  org_id: string;
  applicant_id: string | null;
  company_name: string;
  biz_number: string;
  representative: string;
  phone: string | null;
  email: string | null;
  desired_area: number | null;
  desired_period: string | null;
  purpose: string | null;
  status: ApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  created_at: string;
  organization?: Organization;
}

export interface MoveOut {
  id: string;
  company_id: string;
  contract_id: string;
  org_id: string;
  requested_by: string | null;
  request_date: string;
  exit_date: string | null;
  status: MoveOutStatus;
  reason: string | null;
  inspection_notes: string | null;
  inspection_completed_at: string | null;
  deposit_amount: number;
  deposit_deduction: number;
  deduction_reason: string | null;
  deposit_returned_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  company?: Company;
  contract?: Contract;
}

export interface Notification {
  id: string;
  user_id: string;
  org_id: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}
