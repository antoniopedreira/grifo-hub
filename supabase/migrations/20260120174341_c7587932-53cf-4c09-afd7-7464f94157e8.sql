-- Add lead_origin column to products table
ALTER TABLE products ADD COLUMN lead_origin text;

COMMENT ON COLUMN products.lead_origin IS 'Valor customizado gravado na coluna origin do lead quando criado via formulário deste produto';