import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCashTxt } from "@/lib/parse-cash-txt";
import { parseCashXls } from "@/lib/parse-cash-xls";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, org_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role === "tenant") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const orgId = formData.get("org_id") as string | null;

    if (!file) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    if (!orgId) return NextResponse.json({ error: "기관을 선택하세요" }, { status: 400 });

    // org_admin은 자신의 org만 허용
    if (profile.role === "org_admin" && profile.org_id !== orgId) {
      return NextResponse.json({ error: "권한이 없는 기관입니다" }, { status: 403 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["txt", "xls", "xlsx"].includes(ext)) {
      return NextResponse.json(
        { error: "TXT 또는 XLS/XLSX 파일만 업로드 가능합니다" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    console.log("[cash-upload] file:", file.name, "size:", buffer.byteLength);

    const rows =
      ext === "txt"
        ? parseCashTxt(buffer, file.name)
        : parseCashXls(buffer, file.name);
    console.log("[cash-upload] parsed rows:", rows.length);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "파싱된 데이터가 없습니다. 파일 형식을 확인하세요." },
        { status: 422 }
      );
    }

    // 이미 저장된 seq_no 목록 조회 (같은 org + 파일명)
    // Supabase 기본 1000행 제한 우회: 페이지네이션으로 전체 조회
    const existingSeqNos = new Set<number>();
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data: page } = await supabase
        .from("cash_transactions")
        .select("seq_no")
        .eq("org_id", orgId)
        .eq("file_name", file.name)
        .range(from, from + PAGE - 1);
      if (!page || page.length === 0) break;
      for (const r of page) existingSeqNos.add(r.seq_no);
      if (page.length < PAGE) break;
      from += PAGE;
    }

    // 신규 행만 필터링
    const newRows = rows.filter((r) => !existingSeqNos.has(r.seq_no));
    const skipped = rows.length - newRows.length;
    console.log("[cash-upload] new:", newRows.length, "skipped:", skipped, "existing:", existingSeqNos.size);

    if (newRows.length === 0) {
      return NextResponse.json({ count: 0, skipped });
    }

    // 기존 데이터가 있으면 삭제 후 전체 재삽입 (부분 업로드 방지)
    if (existingSeqNos.size > 0) {
      await supabase
        .from("cash_transactions")
        .delete()
        .eq("org_id", orgId)
        .eq("file_name", file.name);
      // 전체 행을 다시 삽입
      const allRows = rows;
      const CHUNK = 200;
      for (let i = 0; i < allRows.length; i += CHUNK) {
        const chunk = allRows.slice(i, i + CHUNK).map((r) => ({
          ...r,
          org_id: orgId,
          file_name: file.name,
        }));
        const { error: insertErr } = await supabase.from("cash_transactions").insert(chunk);
        if (insertErr) {
          console.error("[cash-upload] insert error at chunk", Math.floor(i / CHUNK), ":", insertErr);
          return NextResponse.json(
            { error: `DB 오류 (${i}행째): ${insertErr.message}` },
            { status: 500 }
          );
        }
      }
      return NextResponse.json({ count: allRows.length, skipped: 0 });
    }

    // 신규 업로드: 200행씩 순차 insert
    const CHUNK = 200;
    let inserted = 0;
    for (let i = 0; i < newRows.length; i += CHUNK) {
      const chunk = newRows.slice(i, i + CHUNK).map((r) => ({
        ...r,
        org_id: orgId,
        file_name: file.name,
      }));
      const { error: insertErr } = await supabase.from("cash_transactions").insert(chunk);
      if (insertErr) {
        console.error("[cash-upload] insert error at chunk", Math.floor(i / CHUNK), ":", insertErr);
        return NextResponse.json(
          { error: `DB 오류 (${inserted}건 삽입 후 실패): ${insertErr.message}`, count: inserted, skipped },
          { status: 500 }
        );
      }
      inserted += chunk.length;
      console.log("[cash-upload] inserted:", inserted, "/", newRows.length);
    }

    return NextResponse.json({ count: inserted, skipped });
  } catch (e: any) {
    console.error("[cash-upload] unexpected:", e);
    return NextResponse.json({ error: e?.message ?? "서버 오류" }, { status: 500 });
  }
}
