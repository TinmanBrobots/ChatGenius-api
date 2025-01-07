-- Enable RLS (Row Level Security)
alter database postgres set timezone to 'UTC';

-- Users Table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  status text default 'offline',
  custom_status text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Channels Table
create table public.channels (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  is_private boolean default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Channel Members Table
create table public.channel_members (
  channel_id uuid references public.channels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (channel_id, user_id)
);

-- Messages Table
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  channel_id uuid references public.channels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  content text not null,
  is_edited boolean default false,
  parent_message_id uuid references public.messages(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Message Reactions Table
create table public.message_reactions (
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (message_id, user_id, emoji)
);

-- Direct Messages Table
create table public.direct_messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.profiles(id) on delete set null,
  receiver_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  is_edited boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- File Attachments Table
create table public.attachments (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references public.messages(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  file_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS Policies
alter table public.profiles enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.direct_messages enable row level security;
alter table public.attachments enable row level security;

-- Create indexes for better performance
create index idx_messages_channel_id on public.messages(channel_id);
create index idx_messages_parent_message_id on public.messages(parent_message_id);
create index idx_channel_members_user_id on public.channel_members(user_id);
create index idx_direct_messages_sender_receiver on public.direct_messages(sender_id, receiver_id);

-- Add triggers for updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row
  execute procedure public.handle_updated_at();

create trigger handle_channels_updated_at
  before update on public.channels
  for each row
  execute procedure public.handle_updated_at();

create trigger handle_messages_updated_at
  before update on public.messages
  for each row
  execute procedure public.handle_updated_at();

create trigger handle_direct_messages_updated_at
  before update on public.direct_messages
  for each row
  execute procedure public.handle_updated_at(); 