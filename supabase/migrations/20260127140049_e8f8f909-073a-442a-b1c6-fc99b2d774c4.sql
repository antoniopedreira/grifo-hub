-- Adiciona coluna para armazenar data/hora do follow-up
ALTER TABLE public.deals
ADD COLUMN followup_date TIMESTAMP WITH TIME ZONE;