-- Enable RLS on marketing_links table
ALTER TABLE public.marketing_links ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (for now, like other tables)
CREATE POLICY "Public access for now"
ON public.marketing_links
FOR ALL
USING (true);