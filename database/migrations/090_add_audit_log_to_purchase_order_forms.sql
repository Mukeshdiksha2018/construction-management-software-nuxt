-- Migration XXX: Add audit_log JSONB column to purchase_order_forms table
-- This column will store a timeline of all changes made to the purchase order

ALTER TABLE public.purchase_order_forms 
ADD COLUMN IF NOT EXISTS audit_log jsonb DEFAULT '[]'::jsonb;

-- Create index on audit_log for better query performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_forms_audit_log_gin 
ON public.purchase_order_forms USING gin (audit_log);

-- Add comment to explain the column structure
COMMENT ON COLUMN public.purchase_order_forms.audit_log IS 
'JSONB array of audit log entries. Each entry contains: timestamp, user_uuid, user_name, user_email, user_image_url, action, description';

