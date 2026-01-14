-- Add support_ids column to team_missions to allow multiple support members
ALTER TABLE public.team_missions 
ADD COLUMN support_ids uuid[] DEFAULT '{}';

-- Migrate existing support_id data to support_ids array
UPDATE public.team_missions 
SET support_ids = ARRAY[support_id] 
WHERE support_id IS NOT NULL;