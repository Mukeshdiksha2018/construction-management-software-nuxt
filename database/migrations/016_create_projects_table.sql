-- Migration 016: Create projects table
-- This table depends on properties table

CREATE TABLE IF NOT EXISTS public.projects (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    corporation_uuid uuid NOT NULL REFERENCES public.properties(uuid) ON DELETE CASCADE,
    
    -- Basic project information
    project_name text NOT NULL,
    project_id text NOT NULL,
    project_type_uuid uuid REFERENCES public.project_types(uuid) ON DELETE RESTRICT,
    service_type_uuid uuid REFERENCES public.service_types(uuid) ON DELETE RESTRICT,
    project_description text,
    
    -- Project details
    estimated_amount decimal(15,2) DEFAULT 0.00,
    area_sq_ft integer,
    no_of_rooms integer,
    contingency_percentage decimal(5,2) DEFAULT 0.00,
    customer_name text,
    project_status text DEFAULT 'Pending' CHECK (project_status IN ('Pending', 'In Progress', 'Completed', 'On Hold')),
    
    -- Project dates
    project_start_date date,
    project_estimated_completion_date date,
    
    -- Project options
    only_total boolean DEFAULT false,
    enable_labor boolean DEFAULT false,
    enable_material boolean DEFAULT false,
    
    -- Attachments (stored as JSONB array)
    attachments jsonb DEFAULT '[]'::jsonb,
    
    -- Status and metadata
    is_active boolean DEFAULT true,
    
    -- Unique constraint for project_id within corporation
    UNIQUE(corporation_uuid, project_id)
);

-- Create indexes for projects table
CREATE INDEX IF NOT EXISTS idx_projects_corporation_uuid ON public.projects(corporation_uuid);
CREATE INDEX IF NOT EXISTS idx_projects_project_id ON public.projects(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_project_type_uuid ON public.projects(project_type_uuid);
CREATE INDEX IF NOT EXISTS idx_projects_service_type_uuid ON public.projects(service_type_uuid);
CREATE INDEX IF NOT EXISTS idx_projects_project_status ON public.projects(project_status);
CREATE INDEX IF NOT EXISTS idx_projects_customer_name ON public.projects(customer_name);
CREATE INDEX IF NOT EXISTS idx_projects_project_start_date ON public.projects(project_start_date);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON public.projects(is_active);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at);
-- No direct FK to project_addresses; addresses reference projects via project_uuid

-- Add constraints for email format validation
-- Removed email format constraint (email moved to project_addresses)

-- Add constraint for address_type values
-- Removed address_type constraint (moved to project_addresses)

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view projects for their corporations" ON public.projects
  FOR SELECT USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can insert projects for their corporations" ON public.projects
  FOR INSERT WITH CHECK (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can update projects for their corporations" ON public.projects
  FOR UPDATE USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

CREATE POLICY "Users can delete projects for their corporations" ON public.projects
  FOR DELETE USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[corporation_uuid]
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON public.projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger for projects
CREATE OR REPLACE FUNCTION log_project_changes()
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
        description := 'Project created: ' || NEW.project_name || ' (ID: ' || NEW.project_id || ')';
        
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
            'project',
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
            jsonb_build_object('project_id', NEW.project_id, 'project_type_uuid', NEW.project_type_uuid)
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
        
        description := 'Project updated: ' || NEW.project_name || ' (ID: ' || NEW.project_id || ')';
        
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
            'project',
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
            jsonb_build_object('project_id', NEW.project_id, 'project_type_uuid', NEW.project_type_uuid)
        );
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        description := 'Project deleted: ' || OLD.project_name || ' (ID: ' || OLD.project_id || ')';
        
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
            'project',
            OLD.uuid,
            OLD.corporation_uuid,
            'deleted',
            to_jsonb(OLD),
            user_info.user_id,
            user_info.user_name,
            user_info.user_email,
            user_info.user_image_url,
            description,
            jsonb_build_object('project_id', OLD.project_id, 'project_type_uuid', OLD.project_type_uuid)
        );
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Audit trigger disabled - uncomment to enable
-- DROP TRIGGER IF EXISTS audit_projects_changes ON public.projects;
-- CREATE TRIGGER audit_projects_changes
--     AFTER INSERT OR UPDATE OR DELETE ON public.projects
--     FOR EACH ROW
--     EXECUTE FUNCTION log_project_changes();

-- ========================================
-- PROJECT DOCUMENTS TABLE
-- ========================================

-- Create project_documents table
CREATE TABLE IF NOT EXISTS public.project_documents (
    id SERIAL PRIMARY KEY,
    uuid uuid UNIQUE DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Foreign key to projects table
    project_uuid uuid NOT NULL REFERENCES public.projects(uuid) ON DELETE CASCADE,
    
    -- Document information
    document_name text NOT NULL,
    document_type text NOT NULL, -- 'pdf', 'image', 'other'
    file_size bigint NOT NULL, -- File size in bytes
    mime_type text NOT NULL, -- MIME type of the file
    
    -- File storage information
    file_url text NOT NULL, -- URL to the stored file (Supabase Storage)
    file_path text NOT NULL, -- Path in Supabase Storage bucket
    
    -- Document metadata
    description text,
    tags text[], -- Array of tags for categorization
    is_primary boolean DEFAULT false, -- Primary document flag
    
    -- Status and metadata
    is_active boolean DEFAULT true,
    uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT check_document_type CHECK (document_type IN ('pdf', 'image', 'other')),
    CONSTRAINT check_file_size CHECK (file_size > 0),
    CONSTRAINT check_mime_type CHECK (mime_type ~ '^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$')
);

-- Create indexes for project_documents table
CREATE INDEX IF NOT EXISTS idx_project_documents_project_uuid ON public.project_documents(project_uuid);
CREATE INDEX IF NOT EXISTS idx_project_documents_document_type ON public.project_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_project_documents_is_active ON public.project_documents(is_active);
CREATE INDEX IF NOT EXISTS idx_project_documents_is_primary ON public.project_documents(is_primary);
CREATE INDEX IF NOT EXISTS idx_project_documents_uploaded_by ON public.project_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_documents_created_at ON public.project_documents(created_at);
CREATE INDEX IF NOT EXISTS idx_project_documents_tags ON public.project_documents USING GIN (tags);

-- Enable RLS for project_documents
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_documents
CREATE POLICY "Users can view project documents for their corporations" ON public.project_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE p.uuid = project_documents.project_uuid
      AND up.corporation_access @> ARRAY[p.corporation_uuid]
    )
  );

CREATE POLICY "Users can insert project documents for their corporations" ON public.project_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE p.uuid = project_documents.project_uuid
      AND up.corporation_access @> ARRAY[p.corporation_uuid]
    )
  );

CREATE POLICY "Users can update project documents for their corporations" ON public.project_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE p.uuid = project_documents.project_uuid
      AND up.corporation_access @> ARRAY[p.corporation_uuid]
    )
  );

CREATE POLICY "Users can delete project documents for their corporations" ON public.project_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE p.uuid = project_documents.project_uuid
      AND up.corporation_access @> ARRAY[p.corporation_uuid]
    )
  );

-- Create trigger for updated_at on project_documents
DROP TRIGGER IF EXISTS update_project_documents_updated_at ON public.project_documents;
CREATE TRIGGER update_project_documents_updated_at 
    BEFORE UPDATE ON public.project_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger for project_documents
CREATE OR REPLACE FUNCTION log_project_document_changes()
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
        description := 'Project document uploaded: ' || NEW.document_name || ' for project ' || COALESCE(project_info.project_name, 'Unknown');
        
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
            'project_document',
            NEW.uuid,
            project_info.corporation_uuid,
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
                'document_name', NEW.document_name,
                'document_type', NEW.document_type
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
        
        description := 'Project document updated: ' || NEW.document_name || ' for project ' || COALESCE(project_info.project_name, 'Unknown');
        
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
            'project_document',
            NEW.uuid,
            project_info.corporation_uuid,
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
                'document_name', NEW.document_name,
                'document_type', NEW.document_type
            )
        );
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        description := 'Project document deleted: ' || OLD.document_name || ' from project ' || COALESCE(project_info.project_name, 'Unknown');
        
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
            'project_document',
            OLD.uuid,
            project_info.corporation_uuid,
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
                'document_name', OLD.document_name,
                'document_type', OLD.document_type
            )
        );
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Audit trigger for project_documents disabled - uncomment to enable
-- DROP TRIGGER IF EXISTS audit_project_documents_changes ON public.project_documents;
-- CREATE TRIGGER audit_project_documents_changes
--     AFTER INSERT OR UPDATE OR DELETE ON public.project_documents
--     FOR EACH ROW
--     EXECUTE FUNCTION log_project_document_changes();

-- Create function to get project documents as JSON array
CREATE OR REPLACE FUNCTION get_project_documents(project_uuid_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    RETURN (
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'uuid', pd.uuid,
                    'document_name', pd.document_name,
                    'document_type', pd.document_type,
                    'file_size', pd.file_size,
                    'mime_type', pd.mime_type,
                    'file_url', pd.file_url,
                    'file_path', pd.file_path,
                    'description', pd.description,
                    'tags', pd.tags,
                    'is_primary', pd.is_primary,
                    'created_at', pd.created_at,
                    'uploaded_by', pd.uploaded_by
                ) ORDER BY pd.created_at DESC
            ),
            '[]'::jsonb
        )
        FROM project_documents pd
        WHERE pd.project_uuid = project_uuid_param
        AND pd.is_active = true
    );
END;
$$;

-- Create function to update project attachments from documents
CREATE OR REPLACE FUNCTION update_project_attachments()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    -- Update the attachments field in projects table when documents change
    UPDATE projects 
    SET attachments = get_project_documents(COALESCE(NEW.project_uuid, OLD.project_uuid))
    WHERE uuid = COALESCE(NEW.project_uuid, OLD.project_uuid);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to automatically update project attachments
DROP TRIGGER IF EXISTS update_project_attachments_trigger ON public.project_documents;
CREATE TRIGGER update_project_attachments_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.project_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_project_attachments();

-- ========================================
-- SUPABASE STORAGE SETUP
-- ========================================

-- Create the project-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for project-documents bucket
-- Policy for viewing files
CREATE POLICY "Users can view project documents for their corporations" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-documents' AND
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE p.uuid::text = (storage.foldername(name))[2]
      AND up.corporation_access @> ARRAY[p.corporation_uuid]
    )
  );

-- Policy for uploading files
CREATE POLICY "Users can upload project documents for their corporations" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-documents' AND
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE p.uuid::text = (storage.foldername(name))[2]
      AND up.corporation_access @> ARRAY[p.corporation_uuid]
    )
  );

-- Policy for updating files
CREATE POLICY "Users can update project documents for their corporations" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-documents' AND
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE p.uuid::text = (storage.foldername(name))[2]
      AND up.corporation_access @> ARRAY[p.corporation_uuid]
    )
  );

-- Policy for deleting files
CREATE POLICY "Users can delete project documents for their corporations" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-documents' AND
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_profiles up ON up.user_id = (SELECT auth.uid())
      WHERE p.uuid::text = (storage.foldername(name))[2]
      AND up.corporation_access @> ARRAY[p.corporation_uuid]
    )
  );

-- Create function to clean up orphaned files when project documents are deleted
CREATE OR REPLACE FUNCTION cleanup_orphaned_project_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Delete the file from storage when a project document is deleted
  IF TG_OP = 'DELETE' THEN
    PERFORM storage.delete_object('project-documents', OLD.file_path);
  END IF;
  
  RETURN COALESCE(OLD, NEW);
END;
$$;

-- Create trigger to clean up files when project documents are deleted
DROP TRIGGER IF EXISTS cleanup_project_files_trigger ON public.project_documents;
CREATE TRIGGER cleanup_project_files_trigger
  AFTER DELETE ON public.project_documents
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_orphaned_project_files();
