-- Create Services table for salon catalog
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  regular_price NUMERIC NOT NULL,
  member_price NUMERIC NOT NULL,
  description TEXT,
  whatsapp_number TEXT DEFAULT '+91 83107 30322',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Allow all access for admin on services" ON public.services USING (true) WITH CHECK (true);
