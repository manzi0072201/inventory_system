insert into permissions (key, label, description)
values
  ('settings', 'Settings', 'Manage company settings and uploaded assets.'),
  ('notifications', 'Notifications', 'Create and manage in-app notifications.'),
  ('announcements', 'Announcements', 'Create and manage announcements.')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description;

insert into role_permissions (role, permission_key, allowed)
values
  ('super_admin', 'settings', true),
  ('super_admin', 'notifications', true),
  ('super_admin', 'announcements', true),
  ('admin', 'settings', false),
  ('admin', 'notifications', true),
  ('admin', 'announcements', false)
on conflict (role, permission_key) do update set
  allowed = excluded.allowed;

create index if not exists announcement_reads_user_idx
  on announcement_reads (user_id, read_at);
