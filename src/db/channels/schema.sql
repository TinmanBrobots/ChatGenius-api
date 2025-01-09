-- CHANNELS SCHEMA

-- Drop existing enum type if exists (to allow recreation)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_type') THEN
        DROP TYPE channel_type;
    END IF;
END $$;

-- Create enum for channel types
CREATE TYPE channel_type AS ENUM ('public', 'private', 'direct');

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
DROP FUNCTION IF EXISTS update_channels_updated_at();

-- Drop existing table if exists
DROP TABLE IF EXISTS channels CASCADE;

-- Create channels table
CREATE TABLE channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    type channel_type NOT NULL DEFAULT 'public',
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE NOT NULL,
    settings JSONB DEFAULT '{
        "notifications": true,
        "pinned_messages": [],
        "default_thread_notifications": true
    }'::jsonb NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS channels_created_by_idx ON channels(created_by);
CREATE INDEX IF NOT EXISTS channels_type_idx ON channels(type);
CREATE INDEX IF NOT EXISTS channels_name_idx ON channels(name);
CREATE INDEX IF NOT EXISTS channels_last_message_at_idx ON channels(last_message_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW
    EXECUTE FUNCTION update_channels_updated_at(); 