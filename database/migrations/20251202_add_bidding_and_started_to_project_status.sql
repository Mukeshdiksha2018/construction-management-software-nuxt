-- Migration: Add 'Bidding' and 'Started' to project_status check constraint
-- This updates the projects table to allow the new status values

-- Drop existing constraint if it exists
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_project_status_check;

-- Add new constraint allowing all status values including Bidding and Started
ALTER TABLE public.projects
ADD CONSTRAINT projects_project_status_check
CHECK (project_status IN ('Pending', 'Bidding', 'Started', 'In Progress', 'Completed', 'On Hold'));

