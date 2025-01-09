-- Users can view public channels and private channels they're members of
CREATE POLICY "Users can view public channels"
ON channels FOR SELECT
USING (
  NOT is_private
  OR EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = channels.id
    AND channel_members.user_id = auth.uid()
  )
);

-- Users can create channels
CREATE POLICY "Users can create channels"
ON channels FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

-- Channel admins can update channel settings
CREATE POLICY "Channel admins can update channel settings"
ON channels FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = id
    AND channel_members.user_id = auth.uid()
    AND channel_members.role = 'admin'
  )
); 