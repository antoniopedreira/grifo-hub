-- Remove unique constraint on slug to allow multiple marketing links per product
ALTER TABLE public.marketing_links DROP CONSTRAINT IF EXISTS marketing_links_slug_key;