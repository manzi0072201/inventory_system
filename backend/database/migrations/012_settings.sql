create table if not exists app_settings (
  id boolean primary key default true check (id),
  company jsonb not null default '{}'::jsonb,
  localization jsonb not null default '{}'::jsonb,
  inventory jsonb not null default '{}'::jsonb,
  sales_pos jsonb not null default '{}'::jsonb,
  purchasing jsonb not null default '{}'::jsonb,
  finance jsonb not null default '{}'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  security jsonb not null default '{}'::jsonb,
  appearance jsonb not null default '{}'::jsonb,
  documents jsonb not null default '{}'::jsonb,
  integrations jsonb not null default '{}'::jsonb,
  system jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references app_users (id) on delete set null
);
