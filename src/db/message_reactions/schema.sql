-- MESSAGE REACTIONS SCHEMA

-- Drop existing table if exists
DROP TABLE IF EXISTS message_reactions CASCADE;

-- Create message_reactions table
CREATE TABLE message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    -- Ensure a user can only react once with the same emoji
    UNIQUE(message_id, profile_id, emoji)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS message_reactions_message_id_idx ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS message_reactions_profile_id_idx ON message_reactions(profile_id);
CREATE INDEX IF NOT EXISTS message_reactions_emoji_idx ON message_reactions(emoji); 