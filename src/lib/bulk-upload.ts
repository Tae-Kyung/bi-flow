import { z } from "zod";

// Korean header → DB column mapping
export const HEADER_MAP: Record<string, string> = {
  기업명: "name",
  사업자등록번호: "biz_number",
  "법인/개인구분": "corporate_type",
  구분: "corporate_type",
  대표자: "representative",
  대표자명: "representative",
  설립일: "founding_date",
  주요사업내용: "business_description",
  주생산품: "main_products",
  홈페이지: "website",
  연락처: "phone",
  "대표 휴대폰": "phone",
  이메일: "email",
  "대표 이메일": "email",
  주소: "address",
  담당자명: "contact_name",
  "담당자 연락처": "contact_phone",
  "담당자 이메일": "contact_email",
  "사무실 전화": "office_phone",
  팩스: "fax",
  "인증 만료일": "certification_expiry",
  비고: "notes",
  // 신규 필드
  입주호실: "space_name",
  최초입주일: "move_in_date",
  계약시작일: "contract_start_date",
  계약만료일: "contract_end_date",
  "담당자2 이름": "contact_name_2",
  "담당자2 연락처": "contact_phone_2",
  "담당자2 이메일": "contact_email_2",
  "담당자3 이름": "contact_name_3",
  "담당자3 연락처": "contact_phone_3",
  "담당자3 이메일": "contact_email_3",
};

// Template column order (Korean headers)
export const TEMPLATE_COLUMNS = [
  "기업명",
  "사업자등록번호",
  "법인/개인구분",
  "대표자명",
  "설립일",
  "주요사업내용",
  "주생산품",
  "홈페이지",
  "연락처",
  "이메일",
  "주소",
  "입주호실",
  "최초입주일",
  "계약시작일",
  "계약만료일",
  "담당자명",
  "담당자 연락처",
  "담당자 이메일",
  "담당자2 이름",
  "담당자2 연락처",
  "담당자2 이메일",
  "담당자3 이름",
  "담당자3 연락처",
  "담당자3 이메일",
  "사무실 전화",
  "팩스",
  "인증 만료일",
  "비고",
];

// Sample data for template (2 rows)
export const TEMPLATE_SAMPLE_DATA = [
  [
    "(주)테크스타트", "101-01-00001", "법인", "김민수", "2020-03-15",
    "SW개발 / 모바일앱", "AI 고객분석 솔루션", "https://techstart.example.com",
    "010-1111-0001", "techstart@example.com", "경남 진주시 진주대로 501",
    "A-101", "2023-03-15", "2023-03-15", "2024-03-14",
    "이수정", "010-1111-1001", "admin@techstart.example.com",
    "", "", "",
    "", "", "",
    "055-111-0001", "055-111-0002", "2026-08-31", "벤처기업 인증",
  ],
  [
    "아이디어팜", "101-01-00003", "개인", "박지영", "2022-01-10",
    "디자인 / UX컨설팅", "UX 리서치 서비스", "",
    "010-1111-0003", "ideafarm@example.com", "경남 진주시 동진로 55",
    "", "", "", "",
    "", "", "",
    "", "", "",
    "", "", "",
    "", "", "", "1인 창업",
  ],
];

// Required DB columns
const REQUIRED_COLUMNS = ["name", "biz_number", "representative"];

// Zod schema for a single company row
export const companyRowSchema = z.object({
  name: z.string().min(1, "기업명은 필수입니다"),
  biz_number: z.string().min(1, "사업자등록번호는 필수입니다"),
  representative: z.string().min(1, "대표자명은 필수입니다"),
  corporate_type: z.string().optional().default(""),
  founding_date: z.string().optional().default(""),
  business_description: z.string().optional().default(""),
  main_products: z.string().optional().default(""),
  website: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z
    .string()
    .email("올바른 이메일 형식이 아닙니다")
    .or(z.literal(""))
    .optional()
    .default(""),
  address: z.string().optional().default(""),
  // 입주/계약 정보
  space_name: z.string().optional().default(""),
  move_in_date: z.string().optional().default(""),
  contract_start_date: z.string().optional().default(""),
  contract_end_date: z.string().optional().default(""),
  // 담당자
  contact_name: z.string().optional().default(""),
  contact_phone: z.string().optional().default(""),
  contact_email: z
    .string()
    .email("올바른 이메일 형식이 아닙니다")
    .or(z.literal(""))
    .optional()
    .default(""),
  contact_name_2: z.string().optional().default(""),
  contact_phone_2: z.string().optional().default(""),
  contact_email_2: z
    .string()
    .email("올바른 이메일 형식이 아닙니다")
    .or(z.literal(""))
    .optional()
    .default(""),
  contact_name_3: z.string().optional().default(""),
  contact_phone_3: z.string().optional().default(""),
  contact_email_3: z
    .string()
    .email("올바른 이메일 형식이 아닙니다")
    .or(z.literal(""))
    .optional()
    .default(""),
  office_phone: z.string().optional().default(""),
  fax: z.string().optional().default(""),
  certification_expiry: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type CompanyRowData = z.infer<typeof companyRowSchema>;

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  parsed: CompanyRowData | null;
  errors: Record<string, string>;
  isDuplicate: boolean;
  duplicateInfo?: string;
  isSelected: boolean;
}

/**
 * Format a value to a YYYY-MM-DD date string if it's a Date object.
 */
function formatValue(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value ?? "").trim();
}

/**
 * Map raw row object (Korean headers) to DB column names.
 * Returns null values as empty strings.
 */
export function mapHeaders(
  row: Record<string, unknown>
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [header, value] of Object.entries(row)) {
    // Strip BOM and whitespace from header
    const trimmedHeader = header.trim().replace(/^\uFEFF/, "");
    const dbCol = HEADER_MAP[trimmedHeader];
    if (dbCol) {
      mapped[dbCol] = formatValue(value);
    }
  }
  // Map Korean corporate_type values to DB values
  if (mapped.corporate_type) {
    const typeMap: Record<string, string> = {
      "법인": "corporation",
      "개인": "individual",
      "예비창업": "pre_startup",
      "예비창업자": "pre_startup",
    };
    mapped.corporate_type = typeMap[mapped.corporate_type] || mapped.corporate_type;
  }
  return mapped;
}

/**
 * Check that mapped headers cover all required columns.
 * Returns list of missing Korean column names.
 */
export function getMissingColumns(
  headers: string[]
): string[] {
  const mappedCols = new Set(
    headers
      .map((h) => HEADER_MAP[h.trim().replace(/^\uFEFF/, "")])
      .filter(Boolean)
  );
  const missing: string[] = [];
  for (const reqCol of REQUIRED_COLUMNS) {
    if (!mappedCols.has(reqCol)) {
      const koreanName = Object.entries(HEADER_MAP).find(
        ([, v]) => v === reqCol
      )?.[0];
      missing.push(koreanName || reqCol);
    }
  }
  return missing;
}

/**
 * Validate a single row with Zod and return errors map.
 */
export function validateRow(
  data: Record<string, string>
): { parsed: CompanyRowData | null; errors: Record<string, string> } {
  const result = companyRowSchema.safeParse(data);
  if (result.success) {
    return { parsed: result.data, errors: {} };
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as string;
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }
  return { parsed: null, errors };
}

/**
 * Check for duplicate biz_numbers within the file rows.
 * Marks rows as duplicate if they share a biz_number with an earlier row.
 */
export function markFileDuplicates(rows: ParsedRow[]): void {
  const seen = new Map<string, number>(); // biz_number → first row number
  for (const row of rows) {
    const bizNum = row.data.biz_number;
    if (!bizNum) continue;
    const firstRow = seen.get(bizNum);
    if (firstRow !== undefined) {
      row.isDuplicate = true;
      row.duplicateInfo = `파일 내 중복 (${firstRow}행과 동일)`;
      row.errors.biz_number =
        row.errors.biz_number || row.duplicateInfo;
      row.isSelected = false;
    } else {
      seen.set(bizNum, row.rowNumber);
    }
  }
}

/**
 * Mark rows whose biz_number already exists in the DB.
 */
export function markDbDuplicates(
  rows: ParsedRow[],
  existingBizNumbers: Set<string>
): void {
  for (const row of rows) {
    const bizNum = row.data.biz_number;
    if (bizNum && existingBizNumbers.has(bizNum)) {
      row.isDuplicate = true;
      row.duplicateInfo = "이미 등록된 사업자등록번호";
      row.errors.biz_number =
        row.errors.biz_number || row.duplicateInfo;
      row.isSelected = false;
    }
  }
}
