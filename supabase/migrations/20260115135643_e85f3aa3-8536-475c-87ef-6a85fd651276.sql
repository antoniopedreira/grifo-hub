-- Adiciona coluna para armazenar o responsável pela reunião no deal
ALTER TABLE public.deals 
ADD COLUMN meeting_owner_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL;