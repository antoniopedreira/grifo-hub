-- Add order_index column for reordering missions within columns
ALTER TABLE public.team_missions 
ADD COLUMN order_index integer DEFAULT 0;

-- Set initial order based on deadline
UPDATE public.team_missions 
SET order_index = sub.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY status ORDER BY deadline ASC NULLS LAST, created_at ASC) as row_num
  FROM public.team_missions
) sub
WHERE public.team_missions.id = sub.id;