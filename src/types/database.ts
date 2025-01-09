export interface Profile {
  // Core Identity
  id: string                     // UUID from auth.users
  username: string               // Unique username for @mentions
  email: string                  // From auth.users, for notifications
  full_name: string             // Display name
  
  // Profile Information
  avatar_url?: string           // Profile picture URL
  bio?: string                  // User's bio/description
  title?: string                // Job title or role
  timezone?: string             // User's timezone for time displays
  
  // Status & Presence
  status: 'online' | 'offline' | 'away' | 'busy'
  custom_status?: string        // Custom status message
  last_seen_at: Date           // Last activity timestamp
  
  // Preferences
  notification_preferences: {    // Stored as JSONB
    email_notifications: boolean
    desktop_notifications: boolean
    mobile_notifications: boolean
    mention_notifications: boolean
  }
  theme_preference: 'light' | 'dark' | 'system'
  
  // Metadata
  created_at: Date             // Account creation date
  updated_at: Date             // Last profile update
  email_verified: boolean      // From auth.users
  is_admin: boolean           // Admin privileges flag
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  is_edited: boolean;
  parent_message_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  created_at: string;
} 