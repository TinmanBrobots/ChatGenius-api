-- Users can view reactions in their channels
CREATE POLICY "Users can view reactions in their channels"
ON message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    JOIN channel_members ON channel_members.channel_id = messages.channel_id
    WHERE messages.id = message_reactions.message_id
    AND channel_members.user_id = auth.uid()
  )
);

-- Users can react to messages in their channels
CREATE POLICY "Users can react to messages in their channels"
ON message_reactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages
    JOIN channel_members ON channel_members.channel_id = messages.channel_id
    WHERE messages.id = message_reactions.message_id
    AND channel_members.user_id = auth.uid()
  )
  AND auth.uid() = user_id
);

-- Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
ON message_reactions FOR DELETE
USING (auth.uid() = user_id); 