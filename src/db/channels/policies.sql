-- CHANNELS POLICIES

-- Enable RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- SELECT policies
CREATE POLICY "Users can view channels"
ON channels FOR SELECT
USING (NOT is_archived);

-- CREATE POLICY "Members can view private channels"
-- ON channels FOR SELECT
-- USING (
--     type = 'private'::channel_type
--     AND NOT is_archived
--     AND (
--         created_by = auth.uid()
--         OR EXISTS (
--             SELECT 1 FROM channel_members
--             WHERE channel_members.channel_id = id
--             AND channel_members.profile_id = auth.uid()
--         )
--     )
-- );

CREATE POLICY "Creator and admins can view all channels"
ON channels FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.is_admin = true
            OR profiles.id = channels.created_by
        )
    )
);

-- INSERT policies
CREATE POLICY "Users can create public channels"
ON channels FOR INSERT
WITH CHECK (
    type = 'public'::channel_type
    AND auth.uid() IS NOT NULL
);

CREATE POLICY "Only admins can create private channels"
ON channels FOR INSERT
WITH CHECK (
    type = 'private'::channel_type
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

CREATE POLICY "Any user can create direct message channels"
ON channels FOR INSERT
WITH CHECK (
    type = 'direct'::channel_type
    AND auth.uid() IS NOT NULL
);

-- UPDATE policies
CREATE POLICY "Creator and admins can update channels"
ON channels FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.is_admin = true
            OR profiles.id = channels.created_by
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.is_admin = true
            OR profiles.id = channels.created_by
        )
    )
);

-- DELETE policies
CREATE POLICY "Creator and admins can delete channels"
ON channels FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.is_admin = true
            OR profiles.id = channels.created_by
        )
    )
); 