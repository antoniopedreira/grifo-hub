-- Add pipeline_id column to products table for automatic deal routing
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE SET NULL;