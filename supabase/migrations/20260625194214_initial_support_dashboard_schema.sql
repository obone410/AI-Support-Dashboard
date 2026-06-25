create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'agent' check (role in ('admin', 'agent', 'customer')),
  team text not null default 'Customer Operations',
  created_at timestamptz not null default now()
);

create table if not exists public.support_teams (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  focus text not null,
  lead text not null,
  coverage text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.support_agents (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null,
  team_id text not null references public.support_teams(id) on delete cascade,
  status text not null check (status in ('Available', 'Busy', 'Offline')),
  capacity integer not null default 0 check (capacity >= 0 and capacity <= 100),
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  customer_name text not null,
  customer_email text not null,
  category text not null,
  priority text not null check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  status text not null check (status in ('Open', 'In Review', 'Waiting', 'Resolved')),
  description text not null,
  assigned_agent_id text,
  team_id text,
  sla_due_at timestamptz not null default now(),
  sentiment text not null check (sentiment in ('Positive', 'Neutral', 'Frustrated', 'At Risk')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_messages (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ticket_id text not null references public.support_tickets(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_evaluation_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ticket_id text,
  request_id text not null,
  source text not null check (source in ('demo', 'openai')),
  model text not null,
  score integer not null check (score >= 0 and score <= 100),
  latency_ms integer not null check (latency_ms >= 0),
  prompt_message_count integer not null default 0 check (prompt_message_count >= 0),
  prompt_char_count integer not null default 0 check (prompt_char_count >= 0),
  response_char_count integer not null default 0 check (response_char_count >= 0),
  safety_passed boolean not null default false,
  grounded_ticket_context boolean not null default false,
  contains_next_steps boolean not null default false,
  contains_customer_reply boolean not null default false,
  notes text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_teams_user_id_idx
on public.support_teams(user_id);

create index if not exists support_agents_user_team_idx
on public.support_agents(user_id, team_id);

create index if not exists support_agents_user_status_idx
on public.support_agents(user_id, status);

create index if not exists support_tickets_user_created_idx
on public.support_tickets(user_id, created_at desc);

create index if not exists support_tickets_user_status_idx
on public.support_tickets(user_id, status);

create index if not exists support_tickets_user_priority_idx
on public.support_tickets(user_id, priority);

create index if not exists support_tickets_user_team_idx
on public.support_tickets(user_id, team_id);

create index if not exists support_tickets_user_agent_idx
on public.support_tickets(user_id, assigned_agent_id);

create index if not exists support_tickets_user_sla_open_idx
on public.support_tickets(user_id, sla_due_at)
where status <> 'Resolved';

create index if not exists conversation_messages_ticket_created_idx
on public.conversation_messages(ticket_id, created_at);

create index if not exists conversation_messages_user_created_idx
on public.conversation_messages(user_id, created_at desc);

create index if not exists ai_evaluation_logs_user_created_idx
on public.ai_evaluation_logs(user_id, created_at desc);

create index if not exists ai_evaluation_logs_ticket_created_idx
on public.ai_evaluation_logs(ticket_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.support_teams enable row level security;
alter table public.support_agents enable row level security;
alter table public.support_tickets enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.ai_evaluation_logs enable row level security;

create policy "Users can read their own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can upsert their own profile"
on public.profiles for insert
with check (auth.uid() = id and role = 'agent');

create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (
    select existing_profile.role
    from public.profiles as existing_profile
    where existing_profile.id = auth.uid()
  )
);

create policy "Users can delete their own profile"
on public.profiles for delete
using (auth.uid() = id);

create policy "Users can read their own teams"
on public.support_teams for select
using (auth.uid() = user_id);

create policy "Users can create their own teams"
on public.support_teams for insert
with check (auth.uid() = user_id);

create policy "Users can update their own teams"
on public.support_teams for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read their own agents"
on public.support_agents for select
using (auth.uid() = user_id);

create policy "Users can create their own agents"
on public.support_agents for insert
with check (auth.uid() = user_id);

create policy "Users can update their own agents"
on public.support_agents for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read their own tickets"
on public.support_tickets for select
using (auth.uid() = user_id);

create policy "Users can create their own tickets"
on public.support_tickets for insert
with check (auth.uid() = user_id);

create policy "Users can update their own tickets"
on public.support_tickets for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own tickets"
on public.support_tickets for delete
using (auth.uid() = user_id);

create policy "Users can read their own messages"
on public.conversation_messages for select
using (auth.uid() = user_id);

create policy "Users can create their own messages"
on public.conversation_messages for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.support_tickets
    where support_tickets.id = conversation_messages.ticket_id
      and support_tickets.user_id = auth.uid()
  )
);

create policy "Users can read their own AI evaluation logs"
on public.ai_evaluation_logs for select
using (auth.uid() = user_id);

create policy "Users can create their own AI evaluation logs"
on public.ai_evaluation_logs for insert
with check (
  auth.uid() = user_id
  and (
    ticket_id is null
    or exists (
      select 1
      from public.support_tickets
      where support_tickets.id = ai_evaluation_logs.ticket_id
        and support_tickets.user_id = auth.uid()
    )
  )
);
