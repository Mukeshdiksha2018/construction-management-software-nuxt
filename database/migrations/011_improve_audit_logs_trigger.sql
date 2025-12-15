-- Migration 013: Create audit_logs table with improved trigger
-- This migration creates the audit_logs table and improved trigger function to prevent duplicates

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS audit_bill_entries_changes ON public.bill_entries;
DROP FUNCTION IF EXISTS log_bill_entry_changes();

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'bill_entry', 'vendor', 'user', etc.
  entity_id uuid NOT NULL, -- ID of the entity being audited
  corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE, -- Corporation reference
  action text NOT NULL, -- 'created', 'updated', 'deleted', 'approved', 'rejected', etc.
  old_values jsonb, -- Previous values (for updates)
  new_values jsonb, -- New values (for creates/updates)
  changed_fields text[], -- Array of field names that changed
  user_id uuid, -- ID of user who performed the action
  user_name text, -- Name of user who performed the action
  user_email text, -- Email of user who performed the action
  user_image_url text, -- Image URL of user who performed the action
  ip_address inet, -- IP address of the user
  user_agent text, -- User agent string
  description text, -- Human-readable description of the action
  metadata jsonb DEFAULT '{}'::jsonb, -- Additional metadata
  timeline_entries jsonb DEFAULT '[]'::jsonb, -- Array of timeline entries for consolidated view
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for audit_logs table
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_corporation_uuid ON public.audit_logs(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_id ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_corporation_entity ON public.audit_logs(corporation_uuid, entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view audit_logs for their corporations" ON public.audit_logs
    FOR SELECT USING (true);

-- Create improved function to log bill entry changes
CREATE OR REPLACE FUNCTION log_bill_entry_changes()
RETURNS TRIGGER AS $$
DECLARE
  old_data jsonb;
  new_data jsonb;
  changed_fields text[] := '{}';
  field_name text;
  action_type text;
  user_info record;
  current_user_id uuid;
  current_user_name text;
  current_user_email text;
  current_user_image_url text;
  description text;
  amount_value numeric;
BEGIN
  -- Get user information from the current session
  current_user_id := current_setting('request.jwt.claims', true)::jsonb->>'sub';
  current_user_name := current_setting('request.jwt.claims', true)::jsonb->>'name';
  current_user_email := current_setting('request.jwt.claims', true)::jsonb->>'email';
  
  -- If no user info from JWT, try to get from user_profiles table
  IF current_user_id IS NOT NULL THEN
    SELECT 
      up.first_name || ' ' || up.last_name as full_name,
      up.image_url
    INTO user_info
    FROM user_profiles up
    WHERE up.user_id = current_user_id::uuid
    LIMIT 1;
    
    -- Use profile name if available, otherwise use JWT name
    IF user_info.full_name IS NOT NULL AND user_info.full_name != ' ' THEN
      current_user_name := user_info.full_name;
    END IF;
    
    -- Store the image URL
    current_user_image_url := user_info.image_url;
  END IF;
  
  -- Determine action type and prepare data
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    new_data := to_jsonb(NEW);
    old_data := NULL;
    amount_value := NEW.amount;
    description := 'Bill entry created: ' || COALESCE(NEW.number, 'N/A') || ' - ' || COALESCE(NEW.payee_name, 'Unknown');
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'updated';
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    amount_value := NEW.amount;
    
    -- Find changed fields (excluding updated_at and created_at)
    FOR field_name IN SELECT jsonb_object_keys(new_data) LOOP
      IF field_name NOT IN ('updated_at', 'created_at') AND 
         old_data->field_name IS DISTINCT FROM new_data->field_name THEN
        changed_fields := array_append(changed_fields, field_name);
      END IF;
    END LOOP;
    
    -- Only create audit log if there are actual changes
    IF array_length(changed_fields, 1) = 0 THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
    
    description := 'Bill entry updated: ' || COALESCE(NEW.number, 'N/A') || ' - ' || COALESCE(NEW.payee_name, 'Unknown');
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
    old_data := to_jsonb(OLD);
    new_data := NULL;
    amount_value := OLD.amount;
    description := 'Bill entry deleted: ' || COALESCE(OLD.number, 'N/A') || ' - ' || COALESCE(OLD.payee_name, 'Unknown');
  END IF;
  
  -- Create a single, consolidated audit log entry
  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    corporation_uuid,
    action,
    old_values,
    new_values,
    changed_fields,
    description,
    user_id,
    user_name,
    user_email,
    user_image_url,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    'bill_entry',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.corporation_uuid, OLD.corporation_uuid),
    action_type,
    old_data,
    new_data,
    changed_fields,
    description,
    current_user_id,
    current_user_name,
    current_user_email,
    current_user_image_url,
    jsonb_build_object(
      'amount', amount_value,
      'bill_number', COALESCE(NEW.number, OLD.number),
      'payee_name', COALESCE(NEW.payee_name, OLD.payee_name),
      'approval_status', COALESCE(NEW.approval_status, OLD.approval_status)
    ),
    now(),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create the improved trigger (disabled - using API-level audit logging instead)
-- CREATE TRIGGER audit_bill_entries_changes
--   AFTER INSERT OR UPDATE OR DELETE ON public.bill_entries
--   FOR EACH ROW
--   EXECUTE FUNCTION log_bill_entry_changes();
