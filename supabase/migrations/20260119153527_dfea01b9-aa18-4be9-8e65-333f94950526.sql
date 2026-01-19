-- Adicionar campos de recorrência à tabela team_missions
ALTER TABLE public.team_missions 
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_type text CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'specific_day')),
ADD COLUMN recurrence_day integer CHECK (recurrence_day >= 1 AND recurrence_day <= 31),
ADD COLUMN parent_mission_id uuid REFERENCES public.team_missions(id) ON DELETE SET NULL;