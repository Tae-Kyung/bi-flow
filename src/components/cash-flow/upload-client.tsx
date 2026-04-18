"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Trash2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCashFile } from "@/actions/cash-flow";

interface UploadedFile {
  file_name: string;
  uploaded_at: string;
  count: number;
  dateFrom: string;
  dateTo: string;
}

interface Props {
  orgId: string;
  uploadedFiles: UploadedFile[];
}

export function CashUploadClient({ orgId, uploadedFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["txt", "xls", "xlsx"].includes(ext)) {
      toast.error("TXT 또는 XLS/XLSX 파일만 업로드 가능합니다");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("org_id", orgId);

      const res = await fetch("/api/cash-upload", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "업로드 실패", { duration: 8000 });
      } else {
        if (json.count === 0) {
          toast.info(`모든 데이터가 이미 존재합니다 (${json.skipped.toLocaleString()}건 중복 건너뜀)`);
        } else if (json.skipped > 0) {
          toast.success(`${json.count.toLocaleString()}건 추가 (${json.skipped.toLocaleString()}건 중복 건너뜀)`);
        } else {
          toast.success(`${json.count.toLocaleString()}건 업로드 완료`);
        }
        router.refresh();
      }
    } catch (e: any) {
      console.error("[upload-client]", e);
      toast.error(e?.message ?? "네트워크 오류", { duration: 8000 });
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onDelete(fileName: string) {
    startTransition(async () => {
      try {
        await deleteCashFile(orgId, fileName);
        toast.success("삭제 완료");
        router.refresh();
      } catch (e: any) {
        toast.error(e?.message ?? "삭제 실패");
      }
    });
  }

  const busy = loading || pending;

  return (
    <div className="space-y-6">
      {/* 드롭존 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !busy && inputRef.current?.click()}
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
          busy ? "pointer-events-none opacity-60 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.xls,.xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        {busy ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium">
            {busy ? "업로드 중..." : "파일을 드래그하거나 클릭하여 업로드"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            형식: TXT (EUC-KR) 또는 XLS/XLSX (충북대 BI 형식)
          </p>
        </div>
      </div>

      {/* 업로드된 파일 목록 */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">업로드된 파일</p>
          {uploadedFiles.map((f) => (
            <div
              key={f.file_name}
              className="flex items-center justify-between rounded-md border p-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium">{f.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.count.toLocaleString()}건 · {f.dateFrom} ~ {f.dateTo}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(f.file_name)}
                disabled={busy}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
