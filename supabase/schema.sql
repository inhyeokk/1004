create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 1 and 20),
    message text not null check (char_length(message) between 1 and 300),
    created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages are publicly readable"
on public.messages for select
to anon, authenticated
using (true);

create policy "messages are publicly insertable"
on public.messages for insert
to anon, authenticated
with check (true);
