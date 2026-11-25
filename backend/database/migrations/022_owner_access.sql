create table if not exists owner_role_overrides (
  user_id uuid primary key references app_users (id) on delete cascade,
  role text not null check (role in ('super_admin', 'admin')),
  updated_at timestamptz not null default now()
);

create table if not exists owner_access_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in ('access_granted', 'access_denied', 'role_changed')
  ),
  actor_user_id uuid references app_users (id) on delete set null,
  actor_email text,
  detail jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists owner_access_events_created_at_idx
  on owner_access_events (created_at desc);

create index if not exists owner_access_events_actor_idx
  on owner_access_events (actor_user_id);

create table if not exists owner_access_attempts (
  key text primary key,
  failed_count integer not null default 0,
  first_failed_at timestamptz,
  last_failed_at timestamptz,
  blocked_until timestamptz
);
