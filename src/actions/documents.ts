"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { DocumentType } from "@/types";

export async function getDocuments(companyId: string) {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*, uploader:profiles!uploaded_by(name, email)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createDocument(params: {
  companyId: string;
  orgId: string;
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  fileSize: number;
}) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("documents").insert({
    company_id: params.companyId,
    org_id: params.orgId,
    type: params.type,
    file_name: params.fileName,
    file_url: params.fileUrl,
    file_size: params.fileSize,
    uploaded_by: profile.id,
  });

  if (error) throw error;
  revalidatePath(`/companies/${params.companyId}`);
}

export async function deleteDocument(id: string, filePath: string) {
  await requireAuth();
  const supabase = await createClient();

  // Storage 파일 삭제
  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([filePath]);

  if (storageError) throw storageError;

  // DB 레코드 삭제
  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (dbError) throw dbError;
  revalidatePath("/companies");
}
