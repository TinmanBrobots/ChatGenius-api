-- Channel Members Table
create table public.channel_members (
  channel_id uuid references public.channels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (channel_id, user_id)
);

-- Enable RLS
alter table public.channel_members enable row level security;

-- Create indexes for better performance
create index idx_channel_members_user_id on public.channel_members(user_id);
create index idx_channel_members_channel_id on public.channel_members(channel_id); 