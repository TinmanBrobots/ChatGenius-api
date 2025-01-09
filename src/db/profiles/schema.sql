-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  -- Core Identity
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3),
  full_name TEXT,
  email TEXT NOT NULL,
  
  -- Profile Information
  avatar_url TEXT,
  bio TEXT,
  title TEXT,
  timezone TEXT,
  
  -- Status & Presence
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'away', 'busy')) DEFAULT 'offline',
  custom_status TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Preferences
  notification_preferences JSONB NOT NULL DEFAULT '{
    "email_notifications": true,
    "desktop_notifications": true,
    "mobile_notifications": true,
    "mention_notifications": true
  }',
  theme_preference TEXT NOT NULL CHECK (theme_preference IN ('light', 'dark', 'system')) DEFAULT 'system',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,

  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) <= 30),
  CONSTRAINT username_format CHECK (username ~* '^[a-zA-Z0-9_]+$')
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- -- Create updated_at trigger
-- CREATE TRIGGER handle_profiles_updated_at
--   BEFORE UPDATE ON profiles
--   FOR EACH ROW
--   EXECUTE FUNCTION handle_updated_at(); 