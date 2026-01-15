-- Add archived column to pipelines table
ALTER TABLE public.pipelines 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;