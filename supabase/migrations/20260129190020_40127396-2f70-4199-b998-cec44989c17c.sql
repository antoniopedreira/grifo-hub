-- Adiciona coluna para rastrear quando o deal entrou no estágio atual
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Atualiza deals existentes: usa created_at como valor inicial
UPDATE public.deals 
SET stage_entered_at = COALESCE(created_at, NOW()) 
WHERE stage_entered_at IS NULL;

-- Cria função trigger para resetar stage_entered_at quando stage_id muda
CREATE OR REPLACE FUNCTION public.update_stage_entered_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atualiza se o stage_id realmente mudou
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    NEW.stage_entered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Cria o trigger
DROP TRIGGER IF EXISTS trigger_update_stage_entered_at ON public.deals;
CREATE TRIGGER trigger_update_stage_entered_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stage_entered_at();