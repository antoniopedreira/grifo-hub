-- Adiciona coluna para armazenar o meio de pagamento acordado na negociação
ALTER TABLE public.deals
ADD COLUMN payment_method text;

COMMENT ON COLUMN public.deals.payment_method IS 'Meio de pagamento acordado durante a fase de negociação (PIX, Cartão, Boleto, etc.)';
