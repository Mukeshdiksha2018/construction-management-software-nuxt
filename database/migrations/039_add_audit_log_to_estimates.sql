-- Migration 039: Add audit_log JSONB column to estimates table
-- This column will store a timeline of all changes made to the estimate

ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS audit_log jsonb DEFAULT '[]'::jsonb;

-- Create index on audit_log for better query performance
CREATE INDEX IF NOT EXISTS idx_estimates_audit_log_gin 
ON public.estimates USING gin (audit_log);

-- Add comment to explain the column structure
COMMENT ON COLUMN public.estimates.audit_log IS 
'JSONB array of audit log entries. Each entry contains: timestamp, user_uuid, user_name, user_email, user_image_url, action, changed_fields, old_values, new_values, description, metadata';

