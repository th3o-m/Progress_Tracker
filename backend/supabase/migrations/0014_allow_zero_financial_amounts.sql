begin;

alter table public.financial_entries
  drop constraint if exists financial_entries_amount_check;

alter table public.financial_entries
  add constraint financial_entries_amount_check check (amount >= 0);

notify pgrst, 'reload schema';

commit;
