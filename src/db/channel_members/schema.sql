-- CHANNEL MEMBERS SCHEMA

-- Drop existing enum type if exists (to allow recreation)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_member_role') THEN
        DROP TYPE channel_member_role;
    END IF;
END $$;

-- Create enum for member roles
CREATE TYPE channel_member_role AS ENUM ('owner', 'admin', 'member');

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS set_channel_owner ON channel_members;
DROP FUNCTION IF EXISTS set_channel_owner();

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

-- -- Add trigger to automatically set owner role for channel creator
-- CREATE OR REPLACE FUNCTION set_channel_owner()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     IF NEW.profile_id = (
--         SELECT created_by 
--         FROM channels 
--         WHERE id = NEW.channel_id
--     ) THEN
--         NEW.role = 'owner';
--     END IF;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

CREATE TRIGGER set_channel_owner
    BEFORE INSERT ON channel_members
    FOR EACH ROW
    EXECUTE FUNCTION set_channel_owner(); 