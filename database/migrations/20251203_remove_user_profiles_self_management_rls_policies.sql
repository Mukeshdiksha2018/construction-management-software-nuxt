-- Migration: Remove RLS policies that allow users to manage their own profiles
-- User profiles should only be managed through server-side API endpoints

-- Drop the policies that allow users to insert/update/view their own profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- Grant necessary permissions to service_role (postgres role used by service role key)
-- This ensures server-side API endpoints can access the tables
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.user_profiles TO postgres;
GRANT ALL ON public.roles TO service_role;
GRANT ALL ON public.roles TO postgres;

-- Drop existing policy if it exists, then create a policy that allows service_role to bypass RLS
-- This is a safeguard in case service role doesn't automatically bypass RLS
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.user_profiles;
CREATE POLICY "Service role can manage all profiles" ON public.user_profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create a policy that allows service_role to access roles table
DROP POLICY IF EXISTS "Service role can manage all roles" ON public.roles;
CREATE POLICY "Service role can manage all roles" ON public.roles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Note: RLS is still enabled on the table, but now only server-side API endpoints
-- with service role key can manage user profiles. This ensures proper access control.
-- The service_role should bypass RLS automatically, but we add explicit grants and policy as safeguards.

