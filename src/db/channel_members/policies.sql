-- CHANNEL MEMBERS POLICIES

-- Enable RLS
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

-- SELECT policies
CREATE POLICY "Users can view members in their channels or public channels"
ON channel_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM channels
        WHERE channels.id = channel_members.channel_id
        AND (
            channels.type = 'public'
            OR EXISTS (
                SELECT 1 FROM channel_members AS cm
                WHERE cm.channel_id = channels.id
                AND cm.profile_id = auth.uid()
            )
        )
        AND NOT channels.is_archived
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
    EXISTS (
        SELECT 1 FROM channel_members AS cm
        WHERE cm.channel_id = channel_members.channel_id
        AND cm.profile_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
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
    EXISTS (
        SELECT 1 FROM channel_members AS cm
        WHERE cm.channel_id = channel_members.channel_id
        AND cm.profile_id = auth.uid()
        AND cm.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM channel_members AS cm
        WHERE cm.channel_id = channel_members.channel_id
        AND cm.profile_id = auth.uid()
        AND cm.role = 'owner'
    )
);

-- DELETE policies
CREATE POLICY "Members can leave channels"
ON channel_members FOR DELETE
USING (profile_id = auth.uid());

CREATE POLICY "Channel owners can remove members"
ON channel_members FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM channel_members AS cm
        WHERE cm.channel_id = channel_members.channel_id
        AND cm.profile_id = auth.uid()
        AND cm.role = 'owner'
    )
); 