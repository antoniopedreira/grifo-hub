-- Altera o default de company_revenue de 0 para NULL
-- Leads manuais ou de outras fontes não devem ter faturamento preenchido por padrão
ALTER TABLE public.leads ALTER COLUMN company_revenue SET DEFAULT NULL;

-- Atualiza os registros existentes que têm 0 para NULL (esses foram criados manualmente)
-- Apenas os que vieram de formulário e responderam a pergunta devem manter o valor
UPDATE public.leads SET company_revenue = NULL WHERE company_revenue = 0;