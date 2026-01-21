-- Create table for WhatsApp quick reply templates
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for full access
CREATE POLICY "Full access whatsapp_templates" 
ON public.whatsapp_templates 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default templates
INSERT INTO public.whatsapp_templates (title, content, order_index) VALUES
  ('Boas vindas', 'Olá! Tudo bem? Vi que você se inscreveu. Posso te ajudar com alguma dúvida?', 1),
  ('Follow-up', 'Oi! Passando para saber se você conseguiu dar uma olhada no material que enviei. Ficou alguma dúvida?', 2),
  ('Lembrete reunião', 'Olá! Só passando para lembrar da nossa reunião agendada. Te espero lá! 😊', 3);