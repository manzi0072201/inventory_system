create table if not exists document_sequences (
  key text primary key,
  prefix text not null,
  next_number integer not null default 1 check (next_number >= 1),
  updated_at timestamptz not null default now()
);
