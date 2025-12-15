-- Migration: Add project_uuid to storage_locations table
-- This migration adds an optional project reference to storage locations

-- Add project_uuid column
ALTER TABLE public.storage_locations 
ADD COLUMN IF NOT EXISTS project_uuid UUID REFERENCES public.projects(uuid) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_storage_locations_project_uuid ON public.storage_locations(project_uuid);

-- Add comment to the column
COMMENT ON COLUMN public.storage_locations.project_uuid IS 'Optional reference to a project this storage location is associated with';

