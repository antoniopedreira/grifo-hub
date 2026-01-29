-- Corrige stage_entered_at dos deals existentes para usar created_at
UPDATE public.deals 
SET stage_entered_at = created_at
WHERE stage_entered_at IS NOT NULL;