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

-- Enable RLS
alter table public.messages enable row level security;

-- Create indexes for better performance
create index idx_messages_channel_id on public.messages(channel_id);
create index idx_messages_parent_message_id on public.messages(parent_message_id);
create index idx_messages_user_id on public.messages(user_id);

-- Create updated_at trigger
create trigger handle_messages_updated_at
  before update on public.messages
  for each row
  execute procedure public.handle_updated_at(); 