-- Add order_index column to deals table if it doesn't exist
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;