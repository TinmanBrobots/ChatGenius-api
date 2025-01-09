-- SELECT
-- Users can view channel members of their channels
CREATE POLICY "Users can view channel members of their channels"
ON channel_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = channel_members.channel_id
    AND cm.user_id = auth.uid()
  )
);

-- INSERT
-- Channel creator can add first member
CREATE POLICY "Channel creator can add first member"
ON channel_members FOR INSERT
WITH CHECK (
  -- Allow if this is the first member being added and they created the channel
  (NOT EXISTS (
    SELECT 1 FROM channel_members 
    WHERE channel_id = channel_members.channel_id
  ) AND EXISTS (
    SELECT 1 FROM channels 
    WHERE id = channel_members.channel_id 
    AND created_by = auth.uid()
  ))
  -- Or if they are a channel admin
  OR EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = channel_members.channel_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'admin'
  )
);

-- UPDATE
-- Channel admins can update members
CREATE POLICY "Channel admins can update members"
ON channel_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = channel_members.channel_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'admin'
  )
);

-- DELETE
-- Channel admins can remove members
CREATE POLICY "Channel admins can remove members"
ON channel_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = channel_members.channel_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'admin'
  )
); 