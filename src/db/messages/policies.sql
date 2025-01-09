-- MESSAGES POLICIES

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- SELECT policies
CREATE POLICY "Users can view messages in their channels"
ON messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM channel_members
        WHERE channel_members.channel_id = messages.channel_id
        AND channel_members.profile_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM channels
        WHERE channels.id = messages.channel_id
        AND channels.type = 'public'
        AND NOT channels.is_archived
    )
    OR
    type = 'system'
);

-- INSERT policies
CREATE POLICY "Users can send messages to their channels"
ON messages FOR INSERT
WITH CHECK (
    (
        EXISTS (
            SELECT 1 FROM channel_members
            WHERE channel_members.channel_id = messages.channel_id
            AND channel_members.profile_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM channels
            WHERE channels.id = messages.channel_id
            AND channels.type = 'public'
            AND NOT channels.is_archived
        )
    )
    AND
    sender_id = auth.uid()
    AND
    type != 'system'
);

CREATE POLICY "System can send system messages"
ON messages FOR INSERT
WITH CHECK (
    type = 'system'
    AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- UPDATE policies
CREATE POLICY "Users can edit their own messages"
ON messages FOR UPDATE
USING (
    sender_id = auth.uid()
    AND deleted_at IS NULL
    AND type != 'system'
)
WITH CHECK (
    sender_id = auth.uid()
    AND deleted_at IS NULL
    AND type != 'system'
);

CREATE POLICY "Admins can edit any message"
ON messages FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- DELETE policies (soft delete)
CREATE POLICY "Users can soft delete their own messages"
ON messages FOR UPDATE
USING (
    sender_id = auth.uid()
    AND deleted_at IS NULL
)
WITH CHECK (
    sender_id = auth.uid()
    AND deleted_at IS NOT NULL
);

CREATE POLICY "Channel admins can soft delete any message in their channels"
ON messages FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM channel_members
        WHERE channel_members.channel_id = messages.channel_id
        AND channel_members.profile_id = auth.uid()
        AND channel_members.role IN ('owner', 'admin')
    )
    AND deleted_at IS NULL
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM channel_members
        WHERE channel_members.channel_id = messages.channel_id
        AND channel_members.profile_id = auth.uid()
        AND channel_members.role IN ('owner', 'admin')
    )
    AND deleted_at IS NOT NULL
); 