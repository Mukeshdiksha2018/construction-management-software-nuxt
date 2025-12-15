-- Migration 024: Create estimates table
-- This table depends on projects table

CREATE TABLE IF NOT EXISTS public.estimates (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    
    -- Foreign key to projects table
    project_uuid uuid NOT NULL REFERENCES public.projects(uuid) ON DELETE RESTRICT,
    
    -- Basic estimate information
    estimate_number text NOT NULL,
    estimate_date date NOT NULL,
    valid_until date,
    
    -- Financial information
    total_amount decimal(15,2) DEFAULT 0.00 NOT NULL,
    tax_amount decimal(15,2) DEFAULT 0.00,
    discount_amount decimal(15,2) DEFAULT 0.00,
    final_amount decimal(15,2) DEFAULT 0.00 NOT NULL,
    
    -- Status and metadata
    status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Approved', 'Rejected', 'Expired')),
    notes text,
    
    -- Removed cost codes per estimate (JSONB array of UUID strings)
    removed_cost_code_uuids jsonb DEFAULT '[]'::jsonb,
    
    -- Attachments (stored as JSONB array)
    attachments jsonb DEFAULT '[]'::jsonb,
    
    -- User tracking
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at timestamp with time zone,
    
    -- Status flag
    is_active boolean DEFAULT true
    
    -- No table-level unique; partial unique index is added below
);

-- Create indexes for estimates table
CREATE INDEX IF NOT EXISTS idx_estimates_corporation_uuid ON public.estimates(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_estimates_project_uuid ON public.estimates(project_uuid);
CREATE INDEX IF NOT EXISTS idx_estimates_estimate_number ON public.estimates(estimate_number);
CREATE INDEX IF NOT EXISTS idx_estimates_estimate_date ON public.estimates(estimate_date);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON public.estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_is_active ON public.estimates(is_active);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON public.estimates(created_at);

-- Unique estimate number per corporation only for active records
CREATE UNIQUE INDEX IF NOT EXISTS ux_estimates_corp_estnum_active
  ON public.estimates (corporation_uuid, estimate_number)
  WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view estimates for their corporations" ON public.estimates
  FOR SELECT USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can insert estimates for their corporations" ON public.estimates
  FOR INSERT WITH CHECK (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can update estimates for their corporations" ON public.estimates
  FOR UPDATE USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can delete estimates for their corporations" ON public.estimates
  FOR DELETE USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_estimates_updated_at ON public.estimates;
CREATE TRIGGER update_estimates_updated_at 
    BEFORE UPDATE ON public.estimates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger for estimates
CREATE OR REPLACE FUNCTION log_estimate_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    old_values jsonb;
    new_values jsonb;
    changed_fields text[];
    description text;
    user_info record;
BEGIN
    -- Get user information
    SELECT 
        auth.uid() as user_id,
        COALESCE(up.first_name || ' ' || up.last_name, 'Unknown User') as user_name,
        COALESCE(auth.jwt() ->> 'email', 'unknown@example.com') as user_email,
        COALESCE(up.image_url, '') as user_image_url
    INTO user_info
    FROM user_profiles up
    WHERE up.user_id = (SELECT auth.uid())
    LIMIT 1;

    -- Handle different operations
    IF TG_OP = 'INSERT' THEN
        new_values := to_jsonb(NEW);
        description := 'Estimate created: ' || NEW.estimate_number || ' for project ' || NEW.project_uuid;
        
        INSERT INTO public.audit_logs (
            entity_type,
            entity_id,
            corporation_uuid,
            action,
            new_values,
            changed_fields,
            user_id,
            user_name,
            user_email,
            user_image_url,
            description,
            metadata
        ) VALUES (
            'estimate',
            NEW.uuid,
            NEW.corporation_uuid,
            'created',
            new_values,
            ARRAY[]::text[],
            user_info.user_id,
            user_info.user_name,
            user_info.user_email,
            user_info.user_image_url,
            description,
            jsonb_build_object('estimate_number', NEW.estimate_number, 'project_uuid', NEW.project_uuid)
        );
        
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        old_values := to_jsonb(OLD);
        new_values := to_jsonb(NEW);
        
        -- Find changed fields
        SELECT ARRAY(
            SELECT key 
            FROM jsonb_each(new_values) 
            WHERE new_values->>key IS DISTINCT FROM old_values->>key
        ) INTO changed_fields;
        
        -- Skip if no meaningful changes
        IF array_length(changed_fields, 1) IS NULL OR 
           (array_length(changed_fields, 1) = 1 AND 'updated_at' = ANY(changed_fields)) THEN
            RETURN NEW;
        END IF;
        
        description := 'Estimate updated: ' || NEW.estimate_number || ' for project ' || NEW.project_uuid;
        
        INSERT INTO public.audit_logs (
            entity_type,
            entity_id,
            corporation_uuid,
            action,
            old_values,
            new_values,
            changed_fields,
            user_id,
            user_name,
            user_email,
            user_image_url,
            description,
            metadata
        ) VALUES (
            'estimate',
            NEW.uuid,
            NEW.corporation_uuid,
            'updated',
            old_values,
            new_values,
            changed_fields,
            user_info.user_id,
            user_info.user_name,
            user_info.user_email,
            user_info.user_image_url,
            description,
            jsonb_build_object('estimate_number', NEW.estimate_number, 'project_uuid', NEW.project_uuid)
        );
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        description := 'Estimate deleted: ' || OLD.estimate_number || ' for project ' || OLD.project_uuid;
        
        INSERT INTO public.audit_logs (
            entity_type,
            entity_id,
            corporation_uuid,
            action,
            old_values,
            user_id,
            user_name,
            user_email,
            user_image_url,
            description,
            metadata
        ) VALUES (
            'estimate',
            OLD.uuid,
            OLD.corporation_uuid,
            'deleted',
            to_jsonb(OLD),
            user_info.user_id,
            user_info.user_name,
            user_info.user_email,
            user_info.user_image_url,
            description,
            jsonb_build_object('estimate_number', OLD.estimate_number, 'project_uuid', OLD.project_uuid)
        );
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Audit trigger disabled - uncomment to enable
-- DROP TRIGGER IF EXISTS audit_estimates_changes ON public.estimates;
-- CREATE TRIGGER audit_estimates_changes
--     AFTER INSERT OR UPDATE OR DELETE ON public.estimates
--     FOR EACH ROW
--     EXECUTE FUNCTION log_estimate_changes();
