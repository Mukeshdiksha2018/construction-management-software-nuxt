-- Migration 089: Add customer_uuid to projects table
-- This adds a foreign key reference to the customers table

-- Add customer_uuid column to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS customer_uuid UUID REFERENCES public.customers(uuid) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_projects_customer_uuid ON public.projects(customer_uuid);

-- Add comment to the column
COMMENT ON COLUMN public.projects.customer_uuid IS 'Reference to the customer associated with this project';

