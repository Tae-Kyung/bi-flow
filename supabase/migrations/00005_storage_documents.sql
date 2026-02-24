-- ============================================
-- Storage bucket for document attachments
-- ============================================

-- 1. Create private storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
) ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS policies

-- 인증 사용자 업로드
CREATE POLICY "인증 사용자 문서 업로드" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND auth.uid() IS NOT NULL
  );

-- 인증 사용자 조회
CREATE POLICY "인증 사용자 문서 조회" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND auth.uid() IS NOT NULL
  );

-- Admin 삭제
CREATE POLICY "Admin 문서 삭제" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'org_admin')
    )
  );
