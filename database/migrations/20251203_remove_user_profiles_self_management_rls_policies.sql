-- Migration: Remove RLS policies that allow users to manage their own profiles
-- User profiles should only be managed through server-side API endpoints

-- Drop the policies that allow users to insert/update/view their own profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- Note: RLS is still enabled on the table, but now only server-side API endpoints
-- with service role key can manage user profiles. This ensures proper access control.

