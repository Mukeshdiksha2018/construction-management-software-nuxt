-- Migration 023: Add RLS policy for properties now that user_profiles exists

-- Create RLS policy (drop first to avoid duplicates on re-run)
DROP POLICY IF EXISTS "Users can view properties for their corporations" ON public.properties;
CREATE POLICY "Users can view properties for their corporations" ON public.properties
  FOR SELECT USING (
    (SELECT corporation_access 
     FROM user_profiles 
     WHERE user_id = (SELECT auth.uid())) @> ARRAY[uuid]
  );

