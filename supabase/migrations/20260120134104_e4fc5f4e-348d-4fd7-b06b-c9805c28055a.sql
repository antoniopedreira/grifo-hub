-- Cria bucket para anexos do CRM
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-attachments', 'crm-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy para usuários autenticados fazerem upload
CREATE POLICY "Authenticated users can upload CRM attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'crm-attachments');

-- Policy para visualizar anexos (público)
CREATE POLICY "Anyone can view CRM attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'crm-attachments');

-- Policy para deletar próprios anexos
CREATE POLICY "Authenticated users can delete CRM attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'crm-attachments');

-- Adiciona coluna para URL do anexo na tabela de checklist items
ALTER TABLE public.crm_checklist_items 
ADD COLUMN IF NOT EXISTS attachment_url TEXT;