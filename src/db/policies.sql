-- Enable RLS on tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Users can view messages in their channels"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = messages.channel_id
    AND channel_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their channels"
ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_members.channel_id = messages.channel_id
    AND channel_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can edit their own messages"
ON messages FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON messages FOR DELETE
USING (auth.uid() = user_id);

-- Reactions policies
CREATE POLICY "Users can view reactions in their channels"
ON reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    JOIN channel_members ON channel_members.channel_id = messages.channel_id
    WHERE messages.id = reactions.message_id
    AND channel_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can react to messages in their channels"
ON reactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages
    JOIN channel_members ON channel_members.channel_id = messages.channel_id
    WHERE messages.id = reactions.message_id
    AND channel_members.user_id = auth.uid()
  )
  AND auth.uid() = user_id
);

CREATE POLICY "Users can remove their own reactions"
ON reactions FOR DELETE
USING (auth.uid() = user_id);

-- Channels policies
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

CREATE POLICY "Users can create channels"
ON channels FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
  )
);

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

-- Channel members policies
CREATE POLICY "Users can view channel members of their channels"
ON channel_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = channel_members.channel_id
    AND cm.user_id = auth.uid()
  )
);

-- Split the channel members management policy into separate policies for different operations
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