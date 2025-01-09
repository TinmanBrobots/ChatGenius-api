-- Users can view messages in their channels
CREATE POLICY "Users can view messages in their channels"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = messages.channel_id
    AND channel_members.user_id = auth.uid()
  )
);

-- Users can send messages to their channels
CREATE POLICY "Users can send messages to their channels"
ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = messages.channel_id
    AND channel_members.user_id = auth.uid()
  )
);

-- Users can edit their own messages
CREATE POLICY "Users can edit their own messages"
ON messages FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
ON messages FOR DELETE
USING (auth.uid() = user_id); 