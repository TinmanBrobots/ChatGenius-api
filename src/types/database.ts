export interface Profile {
  // Core Identity
  id: string;
  username: string;
  full_name: string | null;
  email: string;
  
  // Profile Information
  avatar_url: string | null;
  bio: string | null;
  title: string | null;
  timezone: string | null;
  
  // Status & Presence
  status: 'online' | 'offline' | 'away' | 'busy';
  custom_status: string | null;
  last_seen_at: Date;
  
  // Preferences
  notification_preferences: {
    email_notifications: boolean;
    desktop_notifications: boolean;
    mobile_notifications: boolean;
    mention_notifications: boolean;
  };
  theme_preference: 'light' | 'dark' | 'system';
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  email_verified: boolean;
  is_admin: boolean;
}

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: 'public' | 'private' | 'direct';
  created_by: string;
  created_at: Date;
  updated_at: Date;
  last_message_at: Date;
  is_archived: boolean;
  settings: {
    notifications: boolean;
    pinned_messages: string[];
    default_thread_notifications: boolean;
  };
  parent_id: string | null;
  metadata: Record<string, any>;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  profile_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: Date;
  last_read_at: Date;
  is_muted: boolean;
  settings: {
    notifications: boolean;
    thread_notifications: boolean;
    mention_notifications: boolean;
  };
  metadata: Record<string, any>;
  // Joined data
  profile?: Profile;
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  parent_id: string | null;
  is_edited: boolean;
  edited_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  metadata: Record<string, any>;
  // Joined data
  sender?: Profile;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  profile_id: string;
  emoji: string;
  created_at: Date;
}

export interface Attachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  created_at: Date;
} 