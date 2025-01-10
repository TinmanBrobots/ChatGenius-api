-- CHANNEL MEMBERS POLICIES

CREATE OR REPLACE FUNCTION get_user_channel_ids(profile_id uuid)
RETURNS SETOF uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
    SELECT cm.channel_id 
    FROM channel_members cm
    WHERE cm.profile_id = profile_id;
$$;

CREATE OR REPLACE FUNCTION get_user_channel_role(profile_id uuid, channel_id uuid)
RETURNS text  -- Changed from SETOF uuid to text
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
    SELECT cm.role 
    FROM channel_members cm
    WHERE cm.profile_id = profile_id
    AND cm.channel_id = channel_id;
$$;

-- Enable RLS on the table
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

-- Create the policy using the security definer function
CREATE POLICY "Users can view their own channel members"
ON channel_members FOR SELECT
USING (
    channel_id IN (
        SELECT get_user_channel_ids(auth.uid())
    )
);

CREATE POLICY "Admins can view all channel members"
ON channel_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- INSERT policies
CREATE POLICY "Channel owners and admins can add members"
ON channel_members FOR INSERT
WITH CHECK (
    'owner' = get_user_channel_role(auth.uid(), channel_id)
    OR
    'admin' = get_user_channel_role(auth.uid(), channel_id)
    OR
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

CREATE POLICY "Users can join public channels"
ON channel_members FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM channels
        WHERE channels.id = channel_members.channel_id
        AND channels.type = 'public'
        AND NOT channels.is_archived
    )
    AND profile_id = auth.uid()
);

CREATE POLICY "Users can join private channels that they created"
ON channel_members FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM channels
        WHERE channels.id = channel_members.channel_id
        AND channels.type = 'private'
        AND channels.created_by = auth.uid()
    )
);

-- UPDATE policies
CREATE POLICY "Members can update their own settings"
ON channel_members FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (
    profile_id = auth.uid()
);

CREATE POLICY "Channel owners can update member roles"
ON channel_members FOR UPDATE
USING (
    channel_id IN (
        SELECT get_user_channel_ids(auth.uid())
    )
)
WITH CHECK (
    'owner' = get_user_channel_role(auth.uid(), channel_id)
    OR
    'admin' = get_user_channel_role(auth.uid(), channel_id)
);

-- DELETE policies
CREATE POLICY "Members can leave channels"
ON channel_members FOR DELETE
USING (profile_id = auth.uid());

CREATE POLICY "Channel owners can remove members"
ON channel_members FOR DELETE
USING (
    'owner' = get_user_channel_role(auth.uid(), channel_id)
    OR
    'admin' = get_user_channel_role(auth.uid(), channel_id)
); 
