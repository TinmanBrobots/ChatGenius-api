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

-- Enable RLS
alter table public.channels enable row level security;

-- Create index for better performance
create index idx_channels_created_by on public.channels(created_by);

-- Create updated_at trigger
create trigger handle_channels_updated_at
  before update on public.channels
  for each row
  execute procedure public.handle_updated_at(); 