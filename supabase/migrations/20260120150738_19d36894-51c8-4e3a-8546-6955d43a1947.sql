-- Remove a constraint UNIQUE do nome dos estágios
-- Isso permite que diferentes pipelines tenham estágios com o mesmo nome
ALTER TABLE public.pipeline_stages DROP CONSTRAINT IF EXISTS pipeline_stages_name_key;