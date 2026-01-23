-- Políticas para gerenciamento de formulários NPS por usuários autenticados

-- Permite usuários autenticados visualizarem todos os formulários (não apenas ativos)
CREATE POLICY "Authenticated users can view all nps_forms"
ON public.nps_forms
FOR SELECT
TO authenticated
USING (true);

-- Permite usuários autenticados criarem formulários
CREATE POLICY "Authenticated users can create nps_forms"
ON public.nps_forms
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permite usuários autenticados atualizarem formulários
CREATE POLICY "Authenticated users can update nps_forms"
ON public.nps_forms
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Permite usuários autenticados excluírem formulários
CREATE POLICY "Authenticated users can delete nps_forms"
ON public.nps_forms
FOR DELETE
TO authenticated
USING (true);