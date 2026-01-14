-- Change deadline column from timestamptz to date
ALTER TABLE public.team_missions 
ALTER COLUMN deadline TYPE date USING deadline::date;