import { z } from "zod";

// Korean header → DB column mapping
export const SPACE_HEADER_MAP: Record<string, string> = {
  호실명: "name",
  층: "floor",
  "전용면적(m²)": "area",
  설명: "description",
};

// Template column order (Korean headers)
export const SPACE_TEMPLATE_COLUMNS = [
  "호실명",
  "층",
  "전용면적(m²)",
  "설명",
];

// Required DB columns
const REQUIRED_COLUMNS = ["name", "area"];

// Zod schema for a single space row
export const spaceRowSchema = z.object({
  name: z.string().min(1, "호실명은 필수입니다"),
  area: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number({ error: "전용면적은 숫자여야 합니다" }).positive({ error: "전용면적은 양수여야 합니다" })
  ),
  floor: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

export type SpaceRowData = z.infer<typeof spaceRowSchema>;

export interface ParsedSpaceRow {
  rowNumber: number;
  data: Record<string, string>;
  parsed: SpaceRowData | null;
  errors: Record<string, string>;
  isDuplicate: boolean;
  duplicateInfo?: string;
  isSelected: boolean;
}

/**
 * Map raw row object (Korean headers) to DB column names.
 */
export function mapSpaceHeaders(
  row: Record<string, unknown>
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [header, value] of Object.entries(row)) {
    const trimmedHeader = header.trim();
    const dbCol = SPACE_HEADER_MAP[trimmedHeader];
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
export function getSpaceMissingColumns(headers: string[]): string[] {
  const mappedCols = new Set(
    headers.map((h) => SPACE_HEADER_MAP[h.trim()]).filter(Boolean)
  );
  const missing: string[] = [];
  for (const reqCol of REQUIRED_COLUMNS) {
    if (!mappedCols.has(reqCol)) {
      const koreanName = Object.entries(SPACE_HEADER_MAP).find(
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
export function validateSpaceRow(
  data: Record<string, string>
): { parsed: SpaceRowData | null; errors: Record<string, string> } {
  const result = spaceRowSchema.safeParse(data);
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
 * Check for duplicate names within the file rows.
 */
export function markSpaceFileDuplicates(rows: ParsedSpaceRow[]): void {
  const seen = new Map<string, number>();
  for (const row of rows) {
    const name = row.data.name;
    if (!name) continue;
    const firstRow = seen.get(name);
    if (firstRow !== undefined) {
      row.isDuplicate = true;
      row.duplicateInfo = `파일 내 중복 (${firstRow}행과 동일)`;
      row.errors.name = row.errors.name || row.duplicateInfo;
      row.isSelected = false;
    } else {
      seen.set(name, row.rowNumber);
    }
  }
}

/**
 * Mark rows whose name already exists in the DB.
 */
export function markSpaceDbDuplicates(
  rows: ParsedSpaceRow[],
  existingNames: Set<string>
): void {
  for (const row of rows) {
    const name = row.data.name;
    if (name && existingNames.has(name)) {
      row.isDuplicate = true;
      row.duplicateInfo = "이미 등록된 호실명";
      row.errors.name = row.errors.name || row.duplicateInfo;
      row.isSelected = false;
    }
  }
}
