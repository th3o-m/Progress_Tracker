alter table public.activities
  alter column code drop not null,
  alter column responsible_officer drop not null;
