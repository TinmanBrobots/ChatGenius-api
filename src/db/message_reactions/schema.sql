-- Message Reactions Table
create table public.message_reactions (
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (message_id, user_id, emoji)
);

-- Enable RLS
alter table public.message_reactions enable row level security;

-- Create indexes for better performance
create index idx_message_reactions_message_id on public.message_reactions(message_id);
create index idx_message_reactions_user_id on public.message_reactions(user_id); 