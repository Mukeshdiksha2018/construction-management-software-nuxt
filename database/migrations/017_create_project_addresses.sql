-- Migration 017: Create project_addresses table for multiple addresses per project

CREATE TABLE IF NOT EXISTS public.project_addresses (
  id SERIAL PRIMARY KEY,
  uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- FK
  project_uuid uuid NOT NULL REFERENCES public.projects(uuid) ON DELETE CASCADE,

  -- Address fields
  address_type text CHECK (address_type IS NULL OR address_type IN ('shipment', 'bill', 'final-destination', 'other')),
  contact_person text,
  email text,
  phone text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  zip_code text,
  country text,
  is_primary boolean DEFAULT false,

  -- Active flag
  is_active boolean DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_addresses_project_uuid ON public.project_addresses(project_uuid);
CREATE INDEX IF NOT EXISTS idx_project_addresses_address_type ON public.project_addresses(address_type);
CREATE INDEX IF NOT EXISTS idx_project_addresses_is_active ON public.project_addresses(is_active);

-- Email format check
ALTER TABLE public.project_addresses 
  ADD CONSTRAINT check_project_addresses_email_format 
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- RLS
ALTER TABLE public.project_addresses ENABLE ROW LEVEL SECURITY;

-- RLS policies (inherit corporation access from the parent project)
CREATE POLICY "Users can view project addresses for their corporations" ON public.project_addresses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE p.uuid = project_addresses.project_uuid
      AND up.corporation_access @> ARRAY[p.corporation_uuid]
    )
  );

CREATE POLICY "Users can insert project addresses for their corporations" ON public.project_addresses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE p.uuid = project_addresses.project_uuid
      AND up.corporation_access @> ARRAY[p.corporation_uuid]
    )
  );

CREATE POLICY "Users can update project addresses for their corporations" ON public.project_addresses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE p.uuid = project_addresses.project_uuid
      AND up.corporation_access @> ARRAY[p.corporation_uuid]
    )
  );

CREATE POLICY "Users can delete project addresses for their corporations" ON public.project_addresses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE p.uuid = project_addresses.project_uuid
      AND up.corporation_access @> ARRAY[p.corporation_uuid]
    )
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS update_project_addresses_updated_at ON public.project_addresses;
CREATE TRIGGER update_project_addresses_updated_at 
  BEFORE UPDATE ON public.project_addresses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
