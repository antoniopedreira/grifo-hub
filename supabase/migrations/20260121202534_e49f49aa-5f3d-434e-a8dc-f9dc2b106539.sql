-- Adiciona coluna milestone_date (data marco - imutável após criação)
-- A coluna deadline existente será usada como data variável

ALTER TABLE public.team_missions
ADD COLUMN milestone_date date;

-- Popula milestone_date com o valor atual de deadline para missões existentes
UPDATE public.team_missions
SET milestone_date = deadline
WHERE deadline IS NOT NULL;