-- CHANNEL MEMBERS SCHEMA

-- Drop existing enum type if exists (to allow recreation)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_member_role') THEN
        DROP TYPE channel_member_role;
    END IF;
END $$;

-- Create enum for member roles
CREATE TYPE channel_member_role AS ENUM ('owner', 'admin', 'member');

-- Drop existing table if exists
DROP TABLE IF EXISTS channel_members CASCADE;

-- Create channel_members table
CREATE TABLE channel_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role channel_member_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    is_muted BOOLEAN DEFAULT FALSE NOT NULL,
    settings JSONB DEFAULT '{
        "notifications": true,
        "thread_notifications": true,
        "mention_notifications": true
    }'::jsonb NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(channel_id, profile_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS channel_members_channel_id_idx ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS channel_members_profile_id_idx ON channel_members(profile_id);
CREATE INDEX IF NOT EXISTS channel_members_role_idx ON channel_members(role);
