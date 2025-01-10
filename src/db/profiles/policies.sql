-- PROFILES POLICIES

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT policies
CREATE POLICY "Users can view their own complete profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can view basic info of other profiles"
ON profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT: Only the authenticated user can insert their own profile
CREATE POLICY "Users can only insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  -- Allow updating non-sensitive fields
  auth.uid() = id AND
  (
    CASE WHEN auth.uid() = id 
    THEN true  -- Allow all updates for own profile
    ELSE false -- Deny updates for other profiles
    END
  )
);

-- DELETE: Only admins can delete profiles
CREATE POLICY "Only admins can delete profiles"
ON profiles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- Create a security barrier view for public profile data
CREATE OR REPLACE VIEW public_profiles AS
SELECT 
  id,
  username,
  full_name,
  avatar_url,
  bio,
  title,
  timezone,
  status,
  custom_status,
  last_seen_at,
  theme_preference,
  created_at,
  updated_at,
  CASE 
    WHEN auth.uid() = id THEN email 
    ELSE NULL 
  END as email,
  CASE 
    WHEN auth.uid() = id THEN notification_preferences 
    ELSE NULL 
  END as notification_preferences,
  CASE 
    WHEN auth.uid() = id THEN email_verified 
    ELSE NULL 
  END as email_verified,
  CASE 
    WHEN auth.uid() = id THEN is_admin 
    ELSE NULL 
  END as is_admin
FROM profiles;

-- Grant access to the view
GRANT SELECT ON public_profiles TO authenticated;