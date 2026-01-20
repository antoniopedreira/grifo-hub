-- 1. Criar o produto VIP (copiando características do original)
INSERT INTO products (
  name, 
  price, 
  slug, 
  category_id, 
  template_id, 
  funnel_type, 
  checkout_url, 
  create_deal, 
  is_crm_trigger, 
  active
)
VALUES (
  'Webinar Cultura & Liderança (VIP)',
  297.00,
  'webinar-cultura-lideranca-vip',
  '393688d6-2f23-42b4-aefb-060a026e9b1f',  -- Básicos
  '31843f77-8ae1-48b4-b84e-1faeaa8d4f06',  -- LP Padrão
  'external_link',
  'https://lastlink.com/p/C80C55634/checkout-payment',
  false,
  false,
  true
);

-- 2. Migrar as 23 vendas VIP para o novo produto
UPDATE sales 
SET product_id = (SELECT id FROM products WHERE slug = 'webinar-cultura-lideranca-vip')
WHERE product_name = 'Webinar Cultura & Liderança (VIP)';

-- 3. Corrigir o typo no produto original (Liderença -> Liderança)
UPDATE products 
SET 
  name = 'Webinar Cultura & Liderança',
  slug = 'webinar-cultura-lideranca'
WHERE id = '17fe93c4-a02d-4310-9dda-eb8c6af06f2d';

-- 4. Atualizar o product_name nas vendas do produto original para manter consistência
UPDATE sales 
SET product_name = 'Webinar Cultura & Liderança'
WHERE product_id = '17fe93c4-a02d-4310-9dda-eb8c6af06f2d';