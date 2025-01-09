-- MESSAGE REACTIONS POLICIES

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- SELECT policies
CREATE POLICY "Users can view reactions on messages they can see"
ON message_reactions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM messages
        WHERE messages.id = message_reactions.message_id
        AND (
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
    )
);

-- INSERT policies
CREATE POLICY "Users can react to messages they can see"
ON message_reactions FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM messages
        WHERE messages.id = message_reactions.message_id
        AND messages.deleted_at IS NULL
        AND (
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
    )
    AND profile_id = auth.uid()
);

-- DELETE policies
CREATE POLICY "Users can remove their own reactions"
ON message_reactions FOR DELETE
USING (profile_id = auth.uid());

CREATE POLICY "Channel admins can remove any reaction"
ON message_reactions FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM messages
        JOIN channel_members ON channel_members.channel_id = messages.channel_id
        WHERE messages.id = message_reactions.message_id
        AND channel_members.profile_id = auth.uid()
        AND channel_members.role IN ('owner', 'admin')
    )
); 