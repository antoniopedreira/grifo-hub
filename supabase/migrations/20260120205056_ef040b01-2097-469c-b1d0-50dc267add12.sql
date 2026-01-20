-- Adiciona coluna para armazenar a causa da perda
ALTER TABLE public.deals
ADD COLUMN loss_reason text;

COMMENT ON COLUMN public.deals.loss_reason IS 'Motivo da perda do negócio';