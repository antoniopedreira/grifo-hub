-- Limpar leads com faturamento "Até 500mil" (company_revenue = 0) para NULL
UPDATE leads SET company_revenue = NULL WHERE company_revenue = 0;