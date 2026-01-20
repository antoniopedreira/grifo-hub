-- Adiciona colunas para suporte completo a pagamentos
ALTER TABLE public.deals
ADD COLUMN installments integer,
ADD COLUMN payment_date date,
ADD COLUMN cash_value numeric;

COMMENT ON COLUMN public.deals.installments IS 'Número de parcelas no cartão de crédito';
COMMENT ON COLUMN public.deals.payment_date IS 'Data do pagamento/acordo';
COMMENT ON COLUMN public.deals.cash_value IS 'Valor à vista em pagamento misto (o restante vai para parcelas)';