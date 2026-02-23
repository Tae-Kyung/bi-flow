import { z } from "zod";

// Korean header → DB column mapping
export const HEADER_MAP: Record<string, string> = {
  기업명: "name",
  사업자등록번호: "biz_number",
  대표자: "representative",
  대표자명: "representative",
  연락처: "phone",
  이메일: "email",
  주소: "address",
};

// Template column order (Korean headers)
export const TEMPLATE_COLUMNS = [
  "기업명",
  "사업자등록번호",
  "대표자명",
  "연락처",
  "이메일",
  "주소",
];

// Required DB columns
const REQUIRED_COLUMNS = ["name", "biz_number", "representative"];

// Zod schema for a single company row
export const companyRowSchema = z.object({
  name: z.string().min(1, "기업명은 필수입니다"),
  biz_number: z.string().min(1, "사업자등록번호는 필수입니다"),
  representative: z.string().min(1, "대표자명은 필수입니다"),
  phone: z.string().optional().default(""),
  email: z
    .string()
    .email("올바른 이메일 형식이 아닙니다")
    .or(z.literal(""))
    .optional()
    .default(""),
  address: z.string().optional().default(""),
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
 * Map raw row object (Korean headers) to DB column names.
 * Returns null values as empty strings.
 */
export function mapHeaders(
  row: Record<string, unknown>
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [header, value] of Object.entries(row)) {
    const trimmedHeader = header.trim();
    const dbCol = HEADER_MAP[trimmedHeader];
    if (dbCol) {
      mapped[dbCol] = String(value ?? "").trim();
    }
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
    headers.map((h) => HEADER_MAP[h.trim()]).filter(Boolean)
  );
  const missing: string[] = [];
  for (const reqCol of REQUIRED_COLUMNS) {
    if (!mappedCols.has(reqCol)) {
      // Find Korean name for this column
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
