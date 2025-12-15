-- Migration 020: Create item_types table
-- This table depends on properties (corporations) and projects tables

CREATE TABLE IF NOT EXISTS public.item_types (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Foreign key references
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    project_uuid uuid NOT NULL REFERENCES public.projects(uuid) ON DELETE CASCADE,
    
    -- Item type information
    item_type text NOT NULL,
    short_name text NOT NULL,
    
    -- Status and metadata
    is_active boolean DEFAULT true,
    
    -- Unique constraint for item_type within corporation and project
    UNIQUE(corporation_uuid, project_uuid, item_type),
    -- Unique constraint for short_name within corporation and project
    UNIQUE(corporation_uuid, project_uuid, short_name)
);

-- Create indexes for item_types table
CREATE INDEX IF NOT EXISTS idx_item_types_corporation_uuid ON public.item_types(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_item_types_project_uuid ON public.item_types(project_uuid);
CREATE INDEX IF NOT EXISTS idx_item_types_item_type ON public.item_types(item_type);
CREATE INDEX IF NOT EXISTS idx_item_types_short_name ON public.item_types(short_name);
CREATE INDEX IF NOT EXISTS idx_item_types_is_active ON public.item_types(is_active);
CREATE INDEX IF NOT EXISTS idx_item_types_created_at ON public.item_types(created_at);

-- Enable RLS
ALTER TABLE public.item_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view item types for their corporations" ON public.item_types
  FOR SELECT USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can insert item types for their corporations" ON public.item_types
  FOR INSERT WITH CHECK (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can update item types for their corporations" ON public.item_types
  FOR UPDATE USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can delete item types for their corporations" ON public.item_types
  FOR DELETE USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_item_types_updated_at ON public.item_types;
CREATE TRIGGER update_item_types_updated_at 
    BEFORE UPDATE ON public.item_types 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger for item_types
CREATE OR REPLACE FUNCTION log_item_type_changes()
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
    project_info record;
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

    -- Get project information
    SELECT p.project_name, p.project_id, p.corporation_uuid
    INTO project_info
    FROM projects p
    WHERE p.uuid = COALESCE(NEW.project_uuid, OLD.project_uuid)
    LIMIT 1;

    -- Handle different operations
    IF TG_OP = 'INSERT' THEN
        new_values := to_jsonb(NEW);
        description := 'Item type created: ' || NEW.item_type || ' (' || NEW.short_name || ') for project ' || COALESCE(project_info.project_name, 'Unknown');
        
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
            'item_type',
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
            jsonb_build_object(
                'project_uuid', NEW.project_uuid,
                'project_name', project_info.project_name,
                'project_id', project_info.project_id,
                'item_type', NEW.item_type,
                'short_name', NEW.short_name
            )
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
        
        description := 'Item type updated: ' || NEW.item_type || ' (' || NEW.short_name || ') for project ' || COALESCE(project_info.project_name, 'Unknown');
        
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
            'item_type',
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
            jsonb_build_object(
                'project_uuid', NEW.project_uuid,
                'project_name', project_info.project_name,
                'project_id', project_info.project_id,
                'item_type', NEW.item_type,
                'short_name', NEW.short_name
            )
        );
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        description := 'Item type deleted: ' || OLD.item_type || ' (' || OLD.short_name || ') from project ' || COALESCE(project_info.project_name, 'Unknown');
        
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
            'item_type',
            OLD.uuid,
            OLD.corporation_uuid,
            'deleted',
            to_jsonb(OLD),
            user_info.user_id,
            user_info.user_name,
            user_info.user_email,
            user_info.user_image_url,
            description,
            jsonb_build_object(
                'project_uuid', OLD.project_uuid,
                'project_name', project_info.project_name,
                'project_id', project_info.project_id,
                'item_type', OLD.item_type,
                'short_name', OLD.short_name
            )
        );
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Audit trigger disabled - uncomment to enable
-- DROP TRIGGER IF EXISTS audit_item_types_changes ON public.item_types;
-- CREATE TRIGGER audit_item_types_changes
--     AFTER INSERT OR UPDATE OR DELETE ON public.item_types
--     FOR EACH ROW
--     EXECUTE FUNCTION log_item_type_changes();

-- ========================================
-- ITEM TYPES USAGE TRACKING TABLE
-- ========================================

-- Create item_type_usage table to track which projects are using item types
-- This will help prevent deletion of item types that are in use
CREATE TABLE IF NOT EXISTS public.item_type_usage (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Foreign key references
    item_type_uuid uuid NOT NULL REFERENCES public.item_types(uuid) ON DELETE CASCADE,
    project_uuid uuid NOT NULL REFERENCES public.projects(uuid) ON DELETE CASCADE,
    
    -- Usage information
    usage_count integer DEFAULT 1,
    last_used_at timestamp with time zone DEFAULT now(),
    
    -- Unique constraint to prevent duplicate usage records
    UNIQUE(item_type_uuid, project_uuid)
);

-- Create indexes for item_type_usage table
CREATE INDEX IF NOT EXISTS idx_item_type_usage_item_type_uuid ON public.item_type_usage(item_type_uuid);
CREATE INDEX IF NOT EXISTS idx_item_type_usage_project_uuid ON public.item_type_usage(project_uuid);
CREATE INDEX IF NOT EXISTS idx_item_type_usage_last_used_at ON public.item_type_usage(last_used_at);

-- Enable RLS for item_type_usage
ALTER TABLE public.item_type_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for item_type_usage
CREATE POLICY "Users can view item type usage for their corporations" ON public.item_type_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.item_types it
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE it.uuid = item_type_usage.item_type_uuid
      AND up.corporation_access @> ARRAY[it.corporation_uuid]
    )
  );

CREATE POLICY "Users can insert item type usage for their corporations" ON public.item_type_usage
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.item_types it
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE it.uuid = item_type_usage.item_type_uuid
      AND up.corporation_access @> ARRAY[it.corporation_uuid]
    )
  );

CREATE POLICY "Users can update item type usage for their corporations" ON public.item_type_usage
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.item_types it
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE it.uuid = item_type_usage.item_type_uuid
      AND up.corporation_access @> ARRAY[it.corporation_uuid]
    )
  );

CREATE POLICY "Users can delete item type usage for their corporations" ON public.item_type_usage
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.item_types it
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE it.uuid = item_type_usage.item_type_uuid
      AND up.corporation_access @> ARRAY[it.corporation_uuid]
    )
  );

-- Create trigger for updated_at on item_type_usage
DROP TRIGGER IF EXISTS update_item_type_usage_updated_at ON public.item_type_usage;
CREATE TRIGGER update_item_type_usage_updated_at 
    BEFORE UPDATE ON public.item_type_usage 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- FUNCTIONS FOR ITEM TYPE MANAGEMENT
-- ========================================

-- Function to check if an item type can be deleted (not in use by other projects)
CREATE OR REPLACE FUNCTION can_delete_item_type(item_type_uuid_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    usage_count integer;
BEGIN
    -- Count how many projects are using this item type
    SELECT COUNT(*) INTO usage_count
    FROM item_type_usage itu
    WHERE itu.item_type_uuid = item_type_uuid_param;
    
    -- Can delete if no usage or only used by the project it belongs to
    RETURN usage_count <= 1;
END;
$$;

-- Function to get item types for a specific project
CREATE OR REPLACE FUNCTION get_project_item_types(project_uuid_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'uuid', it.uuid,
                    'item_type', it.item_type,
                    'short_name', it.short_name,
                    'is_active', it.is_active,
                    'created_at', it.created_at,
                    'updated_at', it.updated_at
                ) ORDER BY it.item_type ASC
            ),
            '[]'::jsonb
        )
        FROM item_types it
        WHERE it.project_uuid = project_uuid_param
        AND it.is_active = true
    );
END;
$$;

-- Function to get item types for a corporation (across all projects)
CREATE OR REPLACE FUNCTION get_corporation_item_types(corporation_uuid_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'uuid', it.uuid,
                    'item_type', it.item_type,
                    'short_name', it.short_name,
                    'is_active', it.is_active,
                    'project_uuid', it.project_uuid,
                    'project_name', p.project_name,
                    'project_id', p.project_id,
                    'created_at', it.created_at,
                    'updated_at', it.updated_at
                ) ORDER BY p.project_name ASC, it.item_type ASC
            ),
            '[]'::jsonb
        )
        FROM item_types it
        JOIN projects p ON p.uuid = it.project_uuid
        WHERE it.corporation_uuid = corporation_uuid_param
        AND it.is_active = true
    );
END;
$$;

-- Function to track item type usage
CREATE OR REPLACE FUNCTION track_item_type_usage(item_type_uuid_param uuid, project_uuid_param uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    INSERT INTO item_type_usage (item_type_uuid, project_uuid, usage_count, last_used_at)
    VALUES (item_type_uuid_param, project_uuid_param, 1, now())
    ON CONFLICT (item_type_uuid, project_uuid)
    DO UPDATE SET 
        usage_count = item_type_usage.usage_count + 1,
        last_used_at = now(),
        updated_at = now();
END;
$$;
