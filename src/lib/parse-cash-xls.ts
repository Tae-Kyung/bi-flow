// 현금출납부 XLS 파일 파서 (충북대 BI 형식)
// xlsx 라이브러리로 파싱 후 EUC-KR 문자열을 iconv-lite로 디코딩

import * as XLSX from "xlsx";
import * as iconv from "iconv-lite";
import type { ParsedCashRow } from "./parse-cash-txt";
import { deriveExpenseCategory, deriveIncomeCategory } from "./parse-cash-txt";

// xlsx가 EUC-KR 바이트를 Latin-1로 읽어온 문자열을 올바른 한글로 변환
function decodeEucKr(s: unknown): string {
  if (typeof s !== "string") return String(s ?? "");
  const bytes = Buffer.from(s, "binary");
  return iconv.decode(bytes, "euc-kr");
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

export function parseCashXls(buffer: ArrayBuffer): ParsedCashRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];

  if (raw.length < 2) return [];

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
    const budgetItem = decodeEucKr(cols[14]);
    const billingType = decodeEucKr(cols[17]);
    const desc = decodeEucKr(cols[10]);

    rows.push({
      seq_no: seqNo,
      approved_at,
      approval_no: String(cols[2] ?? ""),
      acct_code: acctCode,
      acct_name: decodeEucKr(cols[4]),
      acct_ref: decodeEucKr(cols[5]),
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

  return rows;
}
