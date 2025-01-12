-- CHANNELS POLICIES

-- Enable RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- SELECT policies
CREATE POLICY "Users can view channels"
ON channels FOR SELECT
USING (NOT is_archived);

CREATE POLICY "Members can view private channels"
ON channels FOR SELECT
USING (
    type = 'private'::channel_type
    AND NOT is_archived
    AND (
        channels.id IN (
            SELECT get_user_channel_ids(auth.uid())
        )
    )
);

CREATE POLICY "Admins can view all channels"
ON channels FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- INSERT policies
CREATE POLICY "Users can create channels"
ON channels FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
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