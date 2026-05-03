// 현금출납부 XLS/XLSX 파일 파서 (충북대 BI 형식)
// .xls: EUC-KR 인코딩 → iconv-lite로 디코딩 필요
// .xlsx: XML 기반 UTF-8 → 디코딩 불필요

import * as XLSX from "xlsx";
import * as iconv from "iconv-lite";
import type { ParsedCashRow } from "./parse-cash-txt";
import { deriveExpenseCategory, deriveIncomeCategory } from "./parse-cash-txt";

// 12-컬럼 형식(G-Center 등)의 col6 "분류" 값을 기존 카테고리 체계에 매핑
function mapShortExpenseCategory(cat: string): string {
  switch (cat) {
    case "인건비": return "인건비";
    case "센터장수당": return "인건비";
    case "운영비": return "운영비";
    case "기업지원비": return "기업지원비";
    case "자산취득비": return "집기·비품";
    case "부가세예수금": case "부가세예수금입금액": return "부가세";
    case "선급법인세": case "선급지방세": return "세금";
    case "환경개선비(발전기금)": return "환경개선비";
    default: return cat || "기타";
  }
}

function mapShortIncomeCategory(cat: string): string {
  switch (cat) {
    case "임대료": return "임대료";
    case "부가세예수금입금액": case "부가세예수금": case "부가세대급금회수액": return "VAT(부가세)";
    case "이자수익": return "이자·기타수익";
    case "기타운영외수익": return "이자·기타수익";
    case "발전기금": return "전입금·보조금";
    default: return cat || "기타수입";
  }
}

// xlsx가 EUC-KR 바이트를 Latin-1로 읽어온 문자열을 올바른 한글로 변환
function decodeEucKr(s: unknown): string {
  if (typeof s !== "string") return String(s ?? "");
  const bytes = Buffer.from(s, "binary");
  return iconv.decode(bytes, "euc-kr");
}

// .xlsx 파일은 이미 UTF-8이므로 그대로 반환
function toStr(s: unknown): string {
  if (typeof s !== "string") return String(s ?? "");
  return s;
}

// Excel 날짜 일련번호 → YYYY-MM-DD
function excelDateToISO(serial: number): string {
  const d = XLSX.SSF.parse_date_code(Math.floor(serial));
  return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
}

// 컬럼 인덱스 (헤더 기준)
// 0:No, 1:승인일자, 2:승인번호, 3:계정코드, 4:계정명, 5:계좌코드,
// 6:전기이월액, 7:입금액, 8:출금액, 9:잔액, 10:적요,
// 11:발의부서, 12:발의일자, 13:발의번호, 14:예산항목,
// 15:과제번호, 16:과제책임자, 17:청구유형

export function parseCashXls(buffer: ArrayBuffer, fileName?: string): ParsedCashRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];

  if (raw.length < 2) return [];

  // .xlsx는 UTF-8이므로 디코딩 불필요, .xls만 EUC-KR 디코딩
  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  const decode = ext === "xlsx" ? toStr : decodeEucKr;

  // 컬럼 수로 형식 판별: 12컬럼(G-Center 등 간소형) vs 18컬럼(충북대 BI 형식)
  const headerLen = (raw[0] as unknown[]).length;
  const isShortFormat = headerLen <= 12;

  const rows: ParsedCashRow[] = [];

  for (let i = 1; i < raw.length; i++) {
    const cols = raw[i] as unknown[];

    // No가 숫자여야 데이터 행 (합계 행 등 제외)
    const seqNo = cols[0];
    if (typeof seqNo !== "number" || seqNo <= 0) continue;

    // 날짜: Excel 일련번호
    const dateSerial = cols[1];
    if (typeof dateSerial !== "number") continue;
    const approved_at = excelDateToISO(dateSerial);

    const deposit = typeof cols[7] === "number" ? (cols[7] as number) : 0;
    const withdrawal = typeof cols[8] === "number" ? (cols[8] as number) : 0;
    if (deposit === 0 && withdrawal === 0) continue;

    const acctCode = String(cols[3] ?? "");
    const desc = decode(cols[10]);

    if (isShortFormat) {
      // 12-컬럼 형식: col6 = 분류 (카테고리가 이미 지정됨)
      const category = decode(cols[6]);

      rows.push({
        seq_no: seqNo,
        approved_at,
        approval_no: String(cols[2] ?? ""),
        acct_code: acctCode,
        acct_name: decode(cols[4]),
        acct_ref: decode(cols[5]),
        deposit,
        withdrawal,
        balance: typeof cols[9] === "number" ? (cols[9] as number) : 0,
        description: desc,
        budget_item: category,
        billing_type: "",
        expense_category:
          withdrawal > 0 ? mapShortExpenseCategory(category) : "",
        income_category:
          deposit > 0 ? mapShortIncomeCategory(category) : "",
      });
    } else {
      // 18-컬럼 형식: 기존 충북대 BI 형식
      const budgetItem = decode(cols[14]);
      const billingType = decode(cols[17]);

      rows.push({
        seq_no: seqNo,
        approved_at,
        approval_no: String(cols[2] ?? ""),
        acct_code: acctCode,
        acct_name: decode(cols[4]),
        acct_ref: decode(cols[5]),
        deposit,
        withdrawal,
        balance: typeof cols[9] === "number" ? (cols[9] as number) : 0,
        description: desc,
        budget_item: budgetItem,
        billing_type: billingType,
        expense_category:
          withdrawal > 0 ? deriveExpenseCategory(budgetItem, billingType, desc) : "",
        income_category: deposit > 0 ? deriveIncomeCategory(acctCode, desc) : "",
      });
    }
  }

  return rows;
}
