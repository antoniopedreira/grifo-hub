-- Create table for deal tags
CREATE TABLE public.deal_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for deal-tag assignments
CREATE TABLE public.deal_tag_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.deal_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(deal_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.deal_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for deal_tags
CREATE POLICY "Full access deal_tags" ON public.deal_tags FOR ALL USING (true) WITH CHECK (true);

-- Create policies for deal_tag_assignments
CREATE POLICY "Full access deal_tag_assignments" ON public.deal_tag_assignments FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_deal_tag_assignments_deal_id ON public.deal_tag_assignments(deal_id);
CREATE INDEX idx_deal_tag_assignments_tag_id ON public.deal_tag_assignments(tag_id);

-- Insert some default tags
INSERT INTO public.deal_tags (name, color, description) VALUES
  ('Novo cliente', '#22c55e', 'Lead que acabou de entrar no funil'),
  ('Pagamento pendente', '#f59e0b', 'Aguardando confirmação de pagamento'),
  ('VIP', '#8b5cf6', 'Cliente de alto valor ou prioridade'),
  ('Urgente', '#ef4444', 'Precisa de atenção imediata'),
  ('Pago', '#10b981', 'Pagamento confirmado');