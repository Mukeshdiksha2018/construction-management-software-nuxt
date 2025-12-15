-- Migration to make service_types global (remove corporation_uuid constraint)
-- This allows service types to be shared across all corporations

-- Step 1: Handle duplicate service type names before making them globally unique
-- For each duplicate name, we'll keep the oldest record and update references

DO $$
DECLARE
    duplicate_name TEXT;
    keeper_uuid UUID;
    duplicate_uuid UUID;
BEGIN
    -- Loop through each duplicate name
    FOR duplicate_name IN 
        SELECT name 
        FROM public.service_types 
        GROUP BY name 
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Processing duplicate service type name: %', duplicate_name;
        
        -- Get the UUID of the oldest record to keep (by created_at, then id)
        SELECT uuid INTO keeper_uuid
        FROM public.service_types
        WHERE name = duplicate_name
        ORDER BY created_at ASC, id ASC
        LIMIT 1;
        
        RAISE NOTICE 'Keeping record with UUID: %', keeper_uuid;
        
        -- Update all projects that reference the duplicate service types to use the keeper
        FOR duplicate_uuid IN 
            SELECT uuid 
            FROM public.service_types 
            WHERE name = duplicate_name 
            AND uuid != keeper_uuid
        LOOP
            RAISE NOTICE 'Updating projects from duplicate UUID % to keeper UUID %', duplicate_uuid, keeper_uuid;
            
            UPDATE public.projects
            SET service_type_uuid = keeper_uuid
            WHERE service_type_uuid = duplicate_uuid;
            
            -- Delete the duplicate record
            DELETE FROM public.service_types WHERE uuid = duplicate_uuid;
            
            RAISE NOTICE 'Deleted duplicate record with UUID: %', duplicate_uuid;
        END LOOP;
    END LOOP;
END $$;

-- Step 2: Drop the unique constraint that includes corporation_uuid
ALTER TABLE public.service_types DROP CONSTRAINT IF EXISTS service_types_corporation_uuid_name_key;

-- Step 3: Drop the index on corporation_uuid
DROP INDEX IF EXISTS idx_service_types_corporation_uuid;

-- Step 4: Drop the foreign key constraint to properties table
ALTER TABLE public.service_types DROP CONSTRAINT IF EXISTS service_types_corporation_uuid_fkey;

-- Step 5: Drop the corporation_uuid column
ALTER TABLE public.service_types DROP COLUMN IF EXISTS corporation_uuid;

-- Step 6: Add new unique constraint on name only (global uniqueness)
ALTER TABLE public.service_types ADD CONSTRAINT service_types_name_key UNIQUE (name);

-- Step 7: Add comment to document the change
COMMENT ON TABLE public.service_types IS 'Global service types table - shared across all corporations';


