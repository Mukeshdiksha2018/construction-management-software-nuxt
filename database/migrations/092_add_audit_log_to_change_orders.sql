-- Migration 092: Add audit_log JSONB column to change_orders table
-- This column will store a timeline of all changes made to the change order

ALTER TABLE public.change_orders 
ADD COLUMN IF NOT EXISTS audit_log jsonb DEFAULT '[]'::jsonb;

-- Create index on audit_log for better query performance
CREATE INDEX IF NOT EXISTS idx_change_orders_audit_log_gin 
ON public.change_orders USING gin (audit_log);

-- Add comment to explain the column structure
COMMENT ON COLUMN public.change_orders.audit_log IS 
'JSONB array of audit log entries. Each entry contains: timestamp, user_uuid, user_name, user_email, user_image_url, action, description';

