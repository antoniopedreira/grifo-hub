-- Corrigir vendas existentes que têm product_name mas não têm product_id
-- Vincula ao produto correto via match de nome (case insensitive)
UPDATE sales
SET product_id = p.id
FROM products p
WHERE sales.product_id IS NULL
  AND sales.product_name IS NOT NULL
  AND LOWER(TRIM(sales.product_name)) = LOWER(TRIM(p.name));