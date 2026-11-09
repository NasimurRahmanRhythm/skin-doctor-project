-- The owner runs the call center's lists, and can bring old calls in.
--
--   call_options        the choices in the call form's Reason and Outcome
--                       dropdowns. The owner adds, renames, reorders and
--                       turns them off; a choice turned off stays on the calls
--                       that already use it. Five of them carry meaning
--                       elsewhere (sold, callback_needed, complaint,
--                       follow_up, other) and are marked `built_in`: they can
--                       be renamed, reordered and turned off, never deleted.
--   call_logs.reason    and .outcome now name a call_options value instead of
--   / .outcome          a fixed list: the old check constraints give way to a
--                       trigger that checks the value exists.
--   call_logs.source    'desk' for a call an agent logged, 'import' for one
--                       the owner brought in from a CSV. An imported complaint
--                       does not ring the owner's alert.
--
-- Run after 20261108000031. Safe to run twice.

create table if not exists public.call_options (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('reason', 'outcome')),
  value       text not null check (value ~ '^[a-z0-9_]{1,40}$'),
  label       text not null check (char_length(label) between 1 and 60),
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  built_in    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (kind, value)
);

insert into public.call_options (kind, value, label, sort_order, built_in) values
  ('reason',  'product_inquiry', 'Product inquiry', 1, false),
  ('reason',  'order',           'Order',           2, false),
  ('reason',  'complaint',       'Complaint',       3, true),
  ('reason',  'follow_up',       'Follow-up',       4, true),
  ('reason',  'other',           'Other',           5, true),
  ('outcome', 'sold',            'Sold',            1, true),
  ('outcome', 'callback_needed', 'Callback needed', 2, true),
  ('outcome', 'resolved',        'Resolved',        3, false),
  ('outcome', 'no_answer',       'No answer',       4, false),
  ('outcome', 'not_interested',  'Not interested',  5, false)
on conflict (kind, value) do nothing;

alter table public.call_options enable row level security;
revoke all on public.call_options from anon;
revoke all on public.call_options from authenticated;
grant select, insert, update, delete on public.call_options to authenticated;

drop policy if exists call_options_read on public.call_options;
create policy call_options_read on public.call_options
  for select to authenticated using (true);

-- Built-in choices are never deleted: other features count them.
drop policy if exists call_options_owner_write on public.call_options;
create policy call_options_owner_write on public.call_options
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

create or replace function public.call_options_keep_built_in()
returns trigger language plpgsql as $fn$
begin
  if old.built_in then
    raise exception 'A built-in choice can be renamed or turned off, not deleted.';
  end if;
  return old;
end $fn$;

drop trigger if exists t_call_options_keep_built_in on public.call_options;
create trigger t_call_options_keep_built_in
  before delete on public.call_options
  for each row execute function public.call_options_keep_built_in();

-- ----------------------------------------- reason/outcome from the list --
alter table public.call_logs drop constraint if exists call_logs_reason_check;
alter table public.call_logs drop constraint if exists call_logs_outcome_check;

create or replace function public.call_logs_check_options()
returns trigger language plpgsql as $fn$
begin
  if not exists (select 1 from public.call_options where kind = 'reason' and value = new.reason) then
    raise exception 'Unknown reason: %', new.reason;
  end if;
  if not exists (select 1 from public.call_options where kind = 'outcome' and value = new.outcome) then
    raise exception 'Unknown outcome: %', new.outcome;
  end if;
  return new;
end $fn$;

drop trigger if exists t_call_logs_check_options on public.call_logs;
create trigger t_call_logs_check_options
  before insert or update of reason, outcome on public.call_logs
  for each row execute function public.call_logs_check_options();

-- A deleted choice must not be in use: the owner turns it off instead.
create or replace function public.call_options_not_in_use()
returns trigger language plpgsql as $fn$
begin
  if exists (
    select 1 from public.call_logs
     where (old.kind = 'reason' and reason = old.value)
        or (old.kind = 'outcome' and outcome = old.value)
  ) then
    raise exception 'Calls already use "%". Turn it off instead of deleting it.', old.label;
  end if;
  return old;
end $fn$;

drop trigger if exists t_call_options_not_in_use on public.call_options;
create trigger t_call_options_not_in_use
  before delete on public.call_options
  for each row execute function public.call_options_not_in_use();

-- ------------------------------------------------------------- imports --
alter table public.call_logs
  add column if not exists source text not null default 'desk';

do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'call_logs_source_check') then
    alter table public.call_logs
      add constraint call_logs_source_check check (source in ('desk', 'import'));
  end if;
end $c$;

drop trigger if exists t_call_logs_notify_complaint on public.call_logs;
create trigger t_call_logs_notify_complaint
  after insert on public.call_logs
  for each row
  when (new.reason = 'complaint' and new.source = 'desk')
  execute function public.notify_owner_on_complaint();
