create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references app_users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
