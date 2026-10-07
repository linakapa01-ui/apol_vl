-- Τρέξε αυτό το αρχείο μία φορά στο Supabase: SQL Editor -> New query -> Run.
-- Ο πίνακας δεν είναι προσβάσιμος απευθείας. Η εφαρμογή διαβάζει και γράφει μόνο
-- μέσω των δύο συναρτήσεων παρακάτω, και μόνο όταν ξέρει τον "κωδικό ομάδας".

create table if not exists public.app_state (
  code text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default clock_timestamp()
);

alter table public.app_state enable row level security;
revoke all on public.app_state from anon, authenticated;

create or replace function public.get_state(p_code text)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object('data', data, 'updated_at', updated_at)
  from public.app_state
  where code = p_code and length(p_code) >= 12;
$$;

create or replace function public.put_state(p_code text, p_data jsonb, p_expected timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  current_ts timestamptz;
  new_ts timestamptz := clock_timestamp();
begin
  if length(p_code) < 12 then
    raise exception 'code too short';
  end if;

  select updated_at into current_ts from public.app_state where code = p_code for update;

  if not found then
    if p_expected is not null then
      return null;
    end if;
    insert into public.app_state (code, data, updated_at) values (p_code, p_data, new_ts);
    return new_ts;
  end if;

  if p_expected is distinct from current_ts then
    return null;
  end if;

  update public.app_state set data = p_data, updated_at = new_ts where code = p_code;
  return new_ts;
end;
$$;

revoke all on function public.get_state(text) from public;
revoke all on function public.put_state(text, jsonb, timestamptz) from public;
grant execute on function public.get_state(text) to anon;
grant execute on function public.put_state(text, jsonb, timestamptz) to anon;
