create table if not exists app_user_activity (
  user_id uuid not null references app_users (id) on delete cascade,
  last_active_at timestamptz not null default now(),
  primary key (user_id)
);

create index if not exists app_user_activity_last_active_idx
  on app_user_activity (last_active_at);
