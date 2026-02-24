# TASK.md - BI-Flow 구현 태스크

> PRD.md 기반 구현 작업 분해. 각 태스크는 독립적으로 완료·검증 가능한 단위로 구성.
> 상태: ⬜ 대기 | 🔲 진행중 | ✅ 완료

---

## Phase 1 - Foundation (MVP 핵심)

### 1.0 프로젝트 초기 설정

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 1.0.1 | Next.js 프로젝트 생성 | `create-next-app` (App Router, TypeScript, Tailwind CSS, ESLint) | ✅ |
| 1.0.2 | shadcn/ui 설치 및 초기 설정 | `npx shadcn@latest init`, 기본 컴포넌트 (Button, Input, Card, Table, Dialog, Form, Toast) 설치 | ✅ |
| 1.0.3 | Supabase 프로젝트 연동 | `@supabase/supabase-js`, `@supabase/ssr` 설치, 환경변수 설정 (`.env.local`), Supabase 클라이언트 유틸리티 생성 (브라우저/서버/미들웨어) | ✅ |
| 1.0.4 | 프로젝트 디렉토리 구조 수립 | `app/`, `components/`, `lib/`, `types/`, `supabase/migrations/` 구조 확정 | ✅ |
| 1.0.5 | Git 저장소 초기화 | `git init`, `.gitignore` 설정 (`.env.local` 포함), 초기 커밋 | ✅ |

### 1.1 데이터베이스 스키마

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 1.1.1 | `organizations` 테이블 | `id (uuid, PK)`, `name`, `type (enum: bi_center, g_tech, convergence)`, `settings (jsonb: rent_unit_price, maintenance_fee_total, distribution_method)`, `created_at`, `updated_at` | ✅ |
| 1.1.2 | `profiles` 테이블 | `id (uuid, PK, FK→auth.users)`, `email`, `name`, `role (enum: super_admin, org_admin, tenant)`, `org_id (FK→organizations, nullable)`, `company_id (FK→companies, nullable)`, `created_at` | ✅ |
| 1.1.3 | `spaces` 테이블 | `id (uuid, PK)`, `org_id (FK)`, `name (호실명)`, `area (전용면적, numeric)`, `status (enum: vacant, occupied)`, `floor`, `description`, `created_at`, `updated_at` | ✅ |
| 1.1.4 | `companies` 테이블 | `id (uuid, PK)`, `org_id (FK)`, `name`, `biz_number (사업자등록번호)`, `representative (대표자명)`, `phone`, `email`, `address`, `status (enum: active, graduated, terminated)`, `created_at`, `updated_at` | ✅ |
| 1.1.5 | `contracts` 테이블 | `id (uuid, PK)`, `company_id (FK)`, `space_id (FK)`, `org_id (FK)`, `start_date`, `end_date`, `rent_amount (월 임대료)`, `deposit (보증금)`, `status (enum: draft, active, expired, terminated)`, `created_at`, `updated_at` | ✅ |
| 1.1.6 | `documents` 테이블 | `id (uuid, PK)`, `company_id (FK)`, `org_id (FK)`, `type (enum: biz_license, biz_plan, contract, etc)`, `file_name`, `file_url`, `file_size`, `uploaded_by (FK→profiles)`, `created_at` | ✅ |
| 1.1.7 | `invoices` 테이블 | `id (uuid, PK)`, `company_id (FK)`, `org_id (FK)`, `contract_id (FK)`, `year_month (varchar, YYYY-MM)`, `rent`, `maintenance_fee`, `extra_charges (jsonb)`, `total`, `due_date`, `status (enum: draft, issued, paid, overdue)`, `issued_at`, `paid_at`, `created_at` | ✅ |
| 1.1.8 | `payments` 테이블 | `id (uuid, PK)`, `invoice_id (FK)`, `amount`, `method (enum: bank_transfer, virtual_account, etc)`, `paid_at`, `confirmed_by (FK→profiles)`, `note`, `created_at` | ✅ |
| 1.1.9 | RLS 정책 수립 | 모든 테이블에 `org_id` 기반 RLS 적용. super_admin은 전체 접근, org_admin은 소속 기관만, tenant는 본인 기업만 | ✅ |
| 1.1.10 | 인덱스 생성 | `org_id`, `company_id`, `status`, `year_month` 등 주요 조회 컬럼에 인덱스 | ✅ |
| 1.1.11 | 시드 데이터 | 3개 기관 (창업보육센터, G-테크벤처센터, 융합기술원) 기본 데이터 삽입 | ✅ |

### 1.2 인증 시스템

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 1.2.1 | Supabase Auth 설정 | 이메일/비밀번호 인증 활성화, 리다이렉트 URL 설정 | ✅ |
| 1.2.2 | 회원가입 페이지 | `/auth/signup` - 이메일, 비밀번호, 이름 입력. 가입 시 `profiles` 테이블 자동 생성 (Database Trigger) | ✅ |
| 1.2.3 | 로그인 페이지 | `/auth/login` - 이메일/비밀번호 로그인, 에러 처리 (잘못된 자격증명, 미인증 이메일) | ✅ |
| 1.2.4 | 로그아웃 | 세션 종료 후 로그인 페이지로 리다이렉트 | ✅ |
| 1.2.5 | Auth Middleware | `middleware.ts` - 미인증 사용자 로그인 페이지 리다이렉트, 토큰 갱신 처리 | ✅ |
| 1.2.6 | 프로필 자동 생성 트리거 | `auth.users` INSERT 시 `profiles` 행 자동 생성하는 PostgreSQL 트리거 함수 | ✅ |
| 1.2.7 | RBAC 유틸리티 | 역할 확인 헬퍼 (`isSuperAdmin`, `isOrgAdmin`, `isTenant`), 역할별 접근 제어 래퍼 | ✅ |

### 1.3 공통 레이아웃

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 1.3.1 | 앱 레이아웃 (`app/(dashboard)/layout.tsx`) | 인증된 사용자 전용 레이아웃. 사이드바 + 헤더 + 메인 콘텐츠 영역 | ✅ |
| 1.3.2 | 사이드바 네비게이션 | 역할별 메뉴 분기: Super Admin (기관 관리, 전체 현황), Org Admin (공간, 입주기업, 정산), Tenant (내 계약, 고지서) | ✅ |
| 1.3.3 | 헤더 컴포넌트 | 사용자 정보 표시, 소속 기관명, 로그아웃 버튼 | ✅ |
| 1.3.4 | 인증 레이아웃 (`app/(auth)/layout.tsx`) | 로그인/회원가입 전용 레이아웃 (사이드바 없음) | ✅ |
| 1.3.5 | 역할별 리다이렉트 | 로그인 후 역할에 따라 적절한 대시보드로 자동 이동 | ✅ |

### 1.4 기관(Organization) 관리

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 1.4.1 | 기관 목록 페이지 | `/organizations` - 전체 기관 카드/테이블 뷰 (Super Admin 전용) | ✅ |
| 1.4.2 | 기관 등록 폼 | 기관명, 유형, 설정값 (면적당 단가, 관리비 총액, 배분 방식) 입력 | ✅ |
| 1.4.3 | 기관 상세/수정 페이지 | `/organizations/[id]` - 기관 정보 조회 및 설정 수정 | ✅ |
| 1.4.4 | 기관 설정 (정산 파라미터) | `settings` JSONB: `rent_unit_price`, `maintenance_fee_total`, `distribution_method`, `invoice_issue_day` | ✅ |
| 1.4.5 | Server Actions | `createOrganization`, `updateOrganization`, `getOrganizations`, `getOrganization` | ✅ |

### 1.5 공간/호실 관리

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 1.5.1 | 공간 목록 페이지 | `/spaces` - 소속 기관의 호실 목록 (상태별 필터: 공실/입주) | ✅ |
| 1.5.2 | 공간 등록 폼 | 호실명, 층, 전용면적, 설명 입력. 기관 자동 바인딩 (Org Admin) 또는 선택 (Super Admin) | ✅ |
| 1.5.3 | 공간 상세/수정 페이지 | `/spaces/[id]` - 공간 정보 조회, 현재 입주 기업 표시, 수정 | ✅ |
| 1.5.4 | 공간 상태 자동 변경 | 계약 생성 시 `occupied`, 계약 종료/퇴거 시 `vacant` 자동 전환 | ✅ |
| 1.5.5 | Server Actions | `createSpace`, `updateSpace`, `getSpaces`, `getSpace` | ✅ |

### 1.6 입주기업 관리

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 1.6.1 | 입주기업 목록 페이지 | `/companies` - 소속 기관의 기업 목록 (상태별 필터: 활동/졸업/해지) | ✅ |
| 1.6.2 | 입주기업 등록 폼 | 기업명, 사업자등록번호, 대표자명, 연락처, 이메일, 주소 입력 | ✅ |
| 1.6.3 | 입주기업 상세 페이지 | `/companies/[id]` - 기업 정보, 계약 이력, 고지서 내역 통합 조회 | ✅ |
| 1.6.4 | 입주기업 수정/상태 변경 | 기업 정보 수정, 상태 변경 (활동→졸업/해지) | ✅ |
| 1.6.5 | Server Actions | `createCompany`, `updateCompany`, `getCompanies`, `getCompany` | ✅ |

### 1.7 Phase 1 검증

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 1.7.1 | E2E 시나리오 테스트 | Super Admin 로그인 → 기관 등록 → 공간 등록 → 입주기업 등록 전체 흐름 | ✅ |
| 1.7.2 | RLS 검증 | Org Admin이 타 기관 데이터에 접근 불가한지 확인 | ✅ |
| 1.7.3 | Vercel 배포 | 프리뷰 배포 및 환경변수 설정 확인 | ✅ |

---

## Phase 2 - 입주·퇴거 프로세스 + 기업 현황

> **전략**: 정산은 기관별 규칙이 상이하여 후순위로 배치.
> 입주→계약→퇴거 프로세스와 기업 현황 파악을 먼저 완성한다.

### 2.1 입주 신청 워크플로우

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 2.1.1 | `applications` 테이블 | `id`, `org_id`, `applicant_id (FK→profiles)`, `company_name`, `biz_number`, `representative`, `desired_area`, `desired_period`, `purpose`, `status (enum: submitted, reviewing, approved, rejected)`, `reviewed_by`, `reviewed_at`, `reject_reason`, `created_at` | ✅ |
| 2.1.2 | 입주 신청 페이지 | `/applications/new` - Tenant 역할 사용자가 기업 정보, 희망 면적, 입주 기간, 사업 목적 입력 | ✅ |
| 2.1.3 | 서류 첨부 기능 | Supabase Storage 버킷 (`documents`) 생성, 파일 업로드 (사업자등록증, 사업계획서), `documents` 테이블 연동 | ⬜ |
| 2.1.4 | 신청 목록 (Org Admin) | `/applications` - 신규/검토중/승인/반려 상태별 필터, 신청 건수 배지 | ✅ |
| 2.1.5 | 신청 검토 페이지 | `/applications/[id]` - 신청서 상세 조회, 승인/반려 액션 (반려 시 사유 입력) | ✅ |
| 2.1.6 | 승인 후 자동 처리 | 승인 시 → `companies` 자동 생성 | ✅ |

### 2.2 계약 관리

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 2.2.1 | 계약 생성 폼 | 입주기업 선택, 호실 배정, 계약 기간, 임대료, 보증금 입력. 호실 상태 자동 변경 | ✅ |
| 2.2.2 | 계약 목록 페이지 | `/contracts` - 상태별 필터 (초안/활성/만료/해지), 만료 예정 하이라이트 | ✅ |
| 2.2.3 | 계약 상세 페이지 | `/contracts/[id]` - 계약 정보, 연결된 기업/호실 정보, 수정 기능 | ✅ |
| 2.2.4 | 계약 만료 알림 로직 | 만료 90/60/30일 전 알림 데이터 생성 (pg_cron 또는 Edge Function) | ⬜ |
| 2.2.5 | 알림 테이블 및 UI | `notifications` 테이블 생성 완료. 헤더 알림 벨 아이콘 UI 미구현 | 🔲 |

### 2.3 퇴거 관리

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 2.3.1 | `move_outs` 테이블 | `id`, `company_id`, `contract_id`, `org_id`, `request_date`, `exit_date`, `status (enum: requested, inspecting, settling, completed)`, `deposit_returned`, `inspection_notes`, `created_at` | ✅ |
| 2.3.2 | 퇴거 신청 페이지 | 퇴거 사유, 희망 퇴거일 입력. Org Admin이 직접 등록 | ✅ |
| 2.3.3 | 시설 점검 체크리스트 | 점검 메모 입력, 점검 완료 처리 (단계별 워크플로우) | ✅ |
| 2.3.4 | 보증금 반환 처리 | 보증금 반환 금액 입력, 공제 사유 기록, 반환 완료 처리 | ✅ |
| 2.3.5 | 퇴거 완료 후처리 | 계약 상태 → `terminated`, 호실 상태 → `vacant`, 기업 상태 → `graduated` 자동 전환 | ✅ |
| 2.3.6 | 졸업 기업 관리 | 졸업 기업 목록 조회, 사후 추적 정보 (매출, 고용, 투자) 입력 양식 | ⬜ |

### 2.4 기업 현황 대시보드

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 2.4.1 | 입주율 현황 카드 | 기관별 입주율 (입주호실/전체호실) 표시 | ✅ |
| 2.4.2 | 기업 상태 요약 | 활동/졸업/해지 기업 수 카드 | ✅ |
| 2.4.3 | 계약 현황 요약 | 활성 계약 수, 30일 내 만료 예정 건수, 만료 예정 기업 목록 | ✅ |
| 2.4.4 | 최근 입주/퇴거 타임라인 | 최근 입주 신청·승인·퇴거 이력 타임라인 | ✅ |
| 2.4.5 | 기관별 비교 차트 (Super Admin) | 기관별 입주율 비교 바 차트 (CSS 기반) | ✅ |

### 2.5 Phase 2 검증

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 2.5.1 | 입주 E2E | Tenant 신청 → Org Admin 검토·승인 → 기업 자동 생성 → 계약 생성 → 호실 상태 변경 | ⬜ |
| 2.5.2 | 퇴거 E2E | 퇴거 신청 → 시설 점검 → 보증금 반환 → 완료 → 호실 공실 전환 → 기업 졸업 | ⬜ |
| 2.5.3 | 서류 업로드/다운로드 | Storage 업로드, RLS로 타 기관 파일 접근 차단 확인 | ⬜ |
| 2.5.4 | 기업 현황 대시보드 | 데이터 정합성 확인 (입주율, 기업 수, 계약 현황) | ⬜ |

---

## Phase 3 - 기업 정보 고도화 + 대시보드 고도화

> **전략**: `Datafield.md` 표준 필드 정의를 반영하여 기업 데이터 모델을 확장하고,
> 확장된 데이터를 기반으로 대시보드를 고도화한다.

### 3.1 기업 정보 데이터 모델 확장 (DB 마이그레이션)

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 3.1.1 | `companies` 테이블 필드 확장 | `corporate_type (TEXT: 법인/개인/예비창업자)`, `founding_date (DATE)`, `business_description (TEXT: 업태/종목/주요 사업내용)`, `main_products (TEXT: 주생산품)`, `website (TEXT)`, `office_phone (TEXT)`, `fax (TEXT)`, `initial_move_in_date (DATE: 최초 입주일)`, `remarks (TEXT: 비고/특이사항)` 추가 | ⬜ |
| 3.1.2 | `company_contacts` 테이블 신규 | `id (uuid, PK)`, `company_id (FK→companies)`, `contact_type (TEXT: representative/admin/tax_invoice)`, `name`, `phone`, `email`, `is_primary (boolean)`, `created_at`, `updated_at`. 대표자·실무담당자·세금계산서 수신 담당자 구분 관리 | ⬜ |
| 3.1.3 | `company_certifications` 테이블 신규 | `id (uuid, PK)`, `company_id (FK→companies)`, `cert_type (TEXT: venture/small_biz/innobiz 등)`, `issued_date (DATE)`, `expiry_date (DATE)`, `status (TEXT: active/expired/renewed)`, `created_at`, `updated_at`. 벤처기업 인증, 소상공인 확인서 등 유효기간 관리 | ⬜ |
| 3.1.4 | `company_annual_records` 테이블 신규 | `id (uuid, PK)`, `company_id (FK→companies)`, `year (INTEGER)`, `revenue (NUMERIC: 매출액)`, `employee_count (INTEGER: 종사자 수)`, `created_at`. 연도별 성과 추적 | ⬜ |
| 3.1.5 | `audit_logs` 테이블 신규 | `id (uuid, PK)`, `table_name`, `record_id`, `action (TEXT: create/update/delete)`, `old_data (JSONB)`, `new_data (JSONB)`, `changed_by (FK→profiles)`, `created_at`. 기업 정보·계약 변경 이력 추적 | ⬜ |
| 3.1.6 | RLS 정책 적용 | `company_contacts`, `company_certifications`, `company_annual_records`, `audit_logs`에 `org_id` 기반 RLS 적용 | ⬜ |
| 3.1.7 | TypeScript 타입 정의 | `src/types/index.ts`에 `CompanyContact`, `CompanyCertification`, `CompanyAnnualRecord`, `AuditLog` 인터페이스 추가. `Company` 인터페이스 확장 필드 반영 | ⬜ |

### 3.2 기업 정보 UI 업데이트

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 3.2.1 | 기업 등록 폼 확장 | 법인/개인 구분, 설립일, 업태/종목, 주생산품, 홈페이지, 사무실 전화/팩스, 비고 입력 필드 추가 | ⬜ |
| 3.2.2 | 담당자 관리 UI | 기업 상세 페이지 내 담당자 탭: 추가/수정/삭제, 유형별(대표자/실무/세금계산서) 관리 | ⬜ |
| 3.2.3 | 인증/자격 관리 UI | 기업 상세 페이지 내 인증 탭: 인증 등록, 만료일 표시, 만료 예정 하이라이트 | ⬜ |
| 3.2.4 | 연도별 성과 관리 UI | 기업 상세 페이지 내 성과 탭: 연도별 매출액·종사자 수 입력/조회 테이블 | ⬜ |
| 3.2.5 | 기업 목록 검색/필터 강화 | 업종별, 법인/개인별, 인증 상태별, 상태별 복합 필터 | ⬜ |
| 3.2.6 | 기업 정보 엑셀 내보내기 | 기업 기본 정보 + 담당자 + 인증 + 성과 통합 엑셀 다운로드 | ⬜ |
| 3.2.7 | 기업 벌크 업로드 확장 | 기존 벌크 업로드에 확장 필드(법인구분, 설립일, 업태 등) 반영 | ⬜ |

### 3.3 기업 정보 Server Actions

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 3.3.1 | `companies` 액션 확장 | `createCompany`, `updateCompany`에 확장 필드 반영 | ⬜ |
| 3.3.2 | `company-contacts` 액션 | `getContacts`, `createContact`, `updateContact`, `deleteContact` | ⬜ |
| 3.3.3 | `company-certifications` 액션 | `getCertifications`, `createCertification`, `updateCertification`, `deleteCertification` | ⬜ |
| 3.3.4 | `company-annual-records` 액션 | `getAnnualRecords`, `createAnnualRecord`, `updateAnnualRecord`, `deleteAnnualRecord` | ⬜ |

### 3.4 대시보드 고도화 - 총괄 (Super Admin)

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 3.4.1 | KPI 카드 | 총 입주기업 수, 평균 입주율, 이번달 신규 입주/퇴거 | ⬜ |
| 3.4.2 | 기관별 비교 차트 | 기관별 입주율 비교, 기업 상태 분포 차트 (recharts) | ⬜ |
| 3.4.3 | 계약 만료 예정 목록 | 30/60/90일 이내 만료 예정 계약 테이블 | ⬜ |
| 3.4.4 | 인증 만료 예정 목록 | 30/60/90일 이내 만료 예정 인증 테이블 | ⬜ |
| 3.4.5 | 최근 활동 로그 | 입주 신청, 계약 생성, 퇴거 등 타임라인 | ⬜ |

### 3.5 대시보드 고도화 - 기관 (Org Admin)

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 3.5.1 | 기관 KPI 카드 | 입주율, 계약 만료 예정, 졸업 기업 수 | ⬜ |
| 3.5.2 | 입주율 추이 차트 | 최근 12개월 입주율 변동 라인 차트 | ⬜ |
| 3.5.3 | 연도별 성과 요약 차트 | 소속 기업 매출액 합계·종사자 수 합계 추이 | ⬜ |
| 3.5.4 | 처리 필요 항목 | 신규 입주 신청, 계약 갱신 대상, 퇴거 진행 중, 인증 만료 예정 목록 | ⬜ |

### 3.6 대시보드 고도화 - 입주기업 (Tenant)

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 3.6.1 | 계약 정보 요약 | 현재 계약 기간, 배정 호실, 계약 잔여일 | ⬜ |
| 3.6.2 | 공지사항 | 기관 공지사항 목록 | ⬜ |

### 3.7 Realtime 연동

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 3.7.1 | Supabase Realtime 구독 | 대시보드 KPI 실시간 업데이트 | ⬜ |

### 3.8 Phase 3 검증

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 3.8.1 | 기업 확장 필드 E2E | 기업 등록(확장 필드 포함) → 담당자 등록 → 인증 등록 → 성과 입력 전체 흐름 | ⬜ |
| 3.8.2 | 대시보드 데이터 정합성 | 실제 DB 데이터와 대시보드 표시 값 일치 확인 | ⬜ |
| 3.8.3 | 역할별 접근 테스트 | 각 역할로 로그인 시 해당 대시보드만 표시되는지 확인 | ⬜ |
| 3.8.4 | RLS 검증 | 신규 테이블에 대한 org_id 기반 데이터 격리 확인 | ⬜ |

---

## Phase 4 - 정산 시스템 (기관별 규칙 수용)

> **주의**: 기관별 정산 방식이 상이하므로 각 기관의 정산 규칙을 사전 조사한 뒤 착수.
> `Datafield.md`의 정산 및 자금 관리 정보 필드를 반영한다.

### 4.1 정산 데이터 모델 확장 (DB 마이그레이션)

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 4.1.1 | `contracts` 테이블 필드 확장 | `unit_price (NUMERIC: m²당 단가)`, `expected_exit_date (DATE: 퇴거 예정일)`, `permit_period_start (DATE)`, `permit_period_end (DATE)` (국유재산허가기간), `deposit_paid (NUMERIC: 보증금 기납부액)` 추가 | ⬜ |
| 4.1.2 | `invoices` 청구 항목 세분화 | `internet_fee (NUMERIC)`, `electricity_fee (NUMERIC)`, `water_fee (NUMERIC)`, `other_fee (NUMERIC)`, `other_fee_description (TEXT)` 추가. 기존 `extra_charges` JSONB에서 정형 컬럼으로 전환 | ⬜ |
| 4.1.3 | 정산 규칙 스키마 확장 | `org_settings` JSONB에 기관 고유 정산 규칙 필드 추가 | ⬜ |
| 4.1.4 | TypeScript 타입 정의 | `Contract`, `Invoice` 인터페이스에 확장 필드 반영 | ⬜ |

### 4.2 기관별 정산 규칙 설정

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 4.2.1 | 정산 규칙 설정 UI | 기관별 정산 파라미터 커스텀 설정 (단가, 관리비, 배분 방식, 부과 항목) | ⬜ |
| 4.2.2 | 계약별 단가 관리 | 계약 생성/수정 시 m²당 단가 입력, 기관 기본 단가 자동 적용 (기업별 오버라이드 가능) | ⬜ |

### 4.3 임대료·관리비 산출

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 4.3.1 | 산출 로직 구현 | DB Function: 기관 설정 기반 임대료·관리비 산출 (임대료 = 전용면적 × 단가) | ⬜ |
| 4.3.2 | 관리비 배분 로직 | 면적 비례, 균등, 커스텀 배분 방식 지원 | ⬜ |
| 4.3.3 | 고지서 일괄 생성 | 특정 월의 전체 활성 계약에 대해 고지서 일괄 생성 (항목별 세분화 반영) | ⬜ |

### 4.4 고지서·수납 관리

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 4.4.1 | 고지서 목록/상세 | 월별·상태별 필터, 일괄 발행, 상세 조회 (항목별 금액 표시) | ⬜ |
| 4.4.2 | 수납 확인 처리 | Org Admin 수동 납부 확인, 미납 자동 감지 | ⬜ |
| 4.4.3 | 보증금 정산 이력 | 보증금 납부·차감·반환 이력 추적 관리 | ⬜ |
| 4.4.4 | 이메일 발송 연동 | Resend API로 고지서/미납 알림 발송 | ⬜ |
| 4.4.5 | 수납 현황 리포트 | 월별 수납률, 미납 금액 요약 | ⬜ |

### 4.5 Phase 4 검증

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 4.5.1 | 정산 E2E | 기관 설정 → 계약 단가 입력 → 고지서 생성 → 수납 확인 → 미납 처리 | ⬜ |
| 4.5.2 | 보증금 E2E | 보증금 납부 → 계약 중 차감 → 퇴거 시 반환 처리 | ⬜ |

---

## Phase 5 - 확장 (Post-MVP)

### 5.1 외부 연동

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 5.1.1 | 전자 서명 연동 | 계약서 전자 서명 API 연동 (모두싸인/도큐싸인) | ⬜ |
| 5.1.2 | 알림톡 연동 | 카카오 알림톡 API 연동 (고지서 발행, 계약 만료 알림) | ⬜ |
| 5.1.3 | 회계·ERP 연동 | 외부 회계 시스템 데이터 연동 API | ⬜ |

### 5.2 플랫폼 확장

| # | 태스크 | 상세 | 상태 |
|---|--------|------|------|
| 5.2.1 | 셀프 온보딩 | 신규 기관이 직접 가입·설정하는 워크플로우 | ⬜ |
| 5.2.2 | 기관 커스텀 설정 고도화 | 워크플로우 커스텀, UI 테마, 브랜딩 설정 | ⬜ |
| 5.2.3 | 데이터 분석·매칭 | 입주기업 성장 지표 분석, 투자자 매칭 기능 | ⬜ |

---

## 의존성 관계

```
Phase 1 (Foundation) ✅
 └→ Phase 2 (입주·퇴거 프로세스 + 기업 현황)  ← 대부분 완료
     └→ Phase 3 (기업 정보 고도화 + 대시보드 고도화)  ← 현재 단계
     │   ├→ 3.1~3.3: 기업 데이터 모델 확장 + UI + Server Actions
     │   └→ 3.4~3.7: 대시보드 고도화 (확장된 데이터 기반)
     └→ Phase 4 (정산 시스템)  ← 기관별 규칙 조사 후 착수
     │   ├→ 4.1: 계약·고지서 데이터 모델 확장
     │   └→ 4.2~4.4: 정산 로직·고지서·수납 관리
     └→ Phase 5 (확장)
```
