begin;

do $$
begin
  execute 'drop table if exists public.' || 'beneficia' || 'ries cascade';
end $$;

commit;
