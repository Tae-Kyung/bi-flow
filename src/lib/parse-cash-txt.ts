// 현금출납부 TXT 파일 파서
// 인코딩: EUC-KR / MS949 (서버사이드 TextDecoder 사용)

export interface ParsedCashRow {
  seq_no: number;
  approved_at: string; // YYYY-MM-DD
  approval_no: string;
  acct_code: string;
  acct_name: string;
  acct_ref: string;
  deposit: number;
  withdrawal: number;
  balance: number;
  description: string;
  budget_item: string;
  billing_type: string;
  expense_category: string;
  income_category: string;
}

function parseAmount(raw: string): number {
  const s = raw.replace(/[",\s]/g, "").trim();
  return s ? parseInt(s, 10) || 0 : 0;
}

export function deriveExpenseCategory(
  budgetItem: string,
  billingType: string,
  desc: string
): string {
  const bi = budgetItem.trim();
  const bt = billingType.trim();
  const d = desc.trim();

  if (bi === "인건비") return "인건비";
  if (bt.includes("인건비정기지급") || bt.includes("인건비성") || bt.includes("퇴직연금") || bt.includes("기관부담금"))
    return "인건비";
  if (bt === "연구수당청구" || bi === "연구수당") return "연구수당";
  if (bt === "여비청구" || bi === "여비") return "여비";
  if (bi === "업무추진비" || d.includes("회의비") || d.includes("특근매식비") || d.includes("워크숍"))
    return "회의·업무추진비";
  if (bi === "운영비" || d.includes("전기요금") || d.includes("공공요금") || d.includes("수도") || d.includes("통신"))
    return "운영비";
  if (bi === "시설보수비" || d.includes("시설보수") || d.includes("블라인드") || d.includes("수리"))
    return "시설보수비";
  if (bi === "집기비품취득" || d.includes("집기") || d.includes("비품") || d.includes("기자재"))
    return "집기·비품";
  if (bi === "기업지원비" || d.includes("기업지원")) return "기업지원비";
  if (bi === "부가세예수금" || d.includes("부가세") || d.includes("부가가치세")) return "부가세";
  if (bi.includes("예수금") || d.includes("오입금")) return "예수금·기타";
  if (bi === "선급법인세" || bi === "선급지방세") return "세금";
  return "기타";
}

export function deriveIncomeCategory(acctCode: string, desc: string): string {
  switch (acctCode) {
    case "510703000": return "임대료";
    case "550207000": return "VAT(부가세)";
    case "210107000": return "보증금수취";
    case "530111000": return "전입금·보조금";
    case "540101000":
    case "540123000": return "이자·기타수익";
    case "510901000": return "기타산학협력수익";
    case "110105000":
      if (desc.includes("이자")) return "이자·기타수익";
      return "현금대체";
    default:
      return "기타수입";
  }
}

export function parseCashTxt(buffer: ArrayBuffer, fileName: string): ParsedCashRow[] {
  const decoder = new TextDecoder("euc-kr");
  const text = decoder.decode(buffer);
  const lines = text.split(/\r?\n/);

  if (lines.length < 2) return [];

  const rows: ParsedCashRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split("\t");
    if (cols.length < 10) continue;

    const approved_at = cols[1]?.trim() ?? "";
    if (!approved_at || approved_at === "0" || !/^\d{4}-\d{2}-\d{2}$/.test(approved_at))
      continue;

    const deposit = parseAmount(cols[7] ?? "");
    const withdrawal = parseAmount(cols[8] ?? "");
    if (deposit === 0 && withdrawal === 0) continue;

    const acctCode = cols[3]?.trim() ?? "";
    const budgetItem = cols[14]?.trim() ?? "";
    const billingType = (cols[17]?.trim() ?? "").replace(/\r$/, "");
    const desc = cols[10]?.trim() ?? "";

    rows.push({
      seq_no: parseInt(cols[0]) || i,
      approved_at,
      approval_no: cols[2]?.trim() ?? "",
      acct_code: acctCode,
      acct_name: cols[4]?.trim() ?? "",
      acct_ref: cols[5]?.trim() ?? "",
      deposit,
      withdrawal,
      balance: parseAmount(cols[9] ?? ""),
      description: desc,
      budget_item: budgetItem,
      billing_type: billingType,
      expense_category: withdrawal > 0
        ? deriveExpenseCategory(budgetItem, billingType, desc)
        : "",
      income_category: deposit > 0
        ? deriveIncomeCategory(acctCode, desc)
        : "",
    });
  }

  return rows;
}
