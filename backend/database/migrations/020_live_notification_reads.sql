create table if not exists live_notification_reads (
  user_id uuid not null references app_users (id) on delete cascade,
  notification_key text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_key)
);
