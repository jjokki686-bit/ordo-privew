-- Profile IDs and friend requests. Run once after 001 and 002.
create table if not exists public.ordo_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (length(btrim(display_name)) between 1 and 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ordo_profiles enable row level security;
drop policy if exists "Signed-in users can view profiles" on public.ordo_profiles;
create policy "Signed-in users can view profiles" on public.ordo_profiles
  for select to authenticated using (true);
drop policy if exists "Users create own profile" on public.ordo_profiles;
create policy "Users create own profile" on public.ordo_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users update own profile" on public.ordo_profiles;
create policy "Users update own profile" on public.ordo_profiles
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.ordo_profiles from anon, authenticated;
grant select on public.ordo_profiles to authenticated;
grant insert (user_id, username, display_name) on public.ordo_profiles to authenticated;
grant update (username, display_name, updated_at) on public.ordo_profiles to authenticated;

create table if not exists public.ordo_friend_requests (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ordo_friend_pair_order check (user_a < user_b),
  constraint ordo_friend_pair_unique unique (user_a, user_b)
);
alter table public.ordo_friend_requests enable row level security;
drop policy if exists "Users view own friend requests" on public.ordo_friend_requests;
create policy "Users view own friend requests" on public.ordo_friend_requests
  for select to authenticated using ((select auth.uid()) in (user_a, user_b));
revoke all on public.ordo_friend_requests from anon, authenticated;
grant select on public.ordo_friend_requests to authenticated;

create or replace function public.ordo_request_friend(p_username text)
returns text language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); target uuid; existing public.ordo_friend_requests%rowtype;
begin
  if caller is null then raise exception 'Sign in required'; end if;
  select p.user_id into target from public.ordo_profiles p where p.username = lower(btrim(p_username));
  if target is null then raise exception 'User not found'; end if;
  if target = caller then raise exception 'Cannot add yourself'; end if;
  select * into existing from public.ordo_friend_requests r
    where r.user_a = least(caller,target) and r.user_b = greatest(caller,target) for update;
  if found then
    if existing.status = 'accepted' then return 'accepted'; end if;
    if existing.status = 'pending' and existing.requested_by <> caller then
      update public.ordo_friend_requests set status='accepted', updated_at=now() where id=existing.id;
      return 'accepted';
    elsif existing.status = 'pending' then return 'pending'; end if;
    update public.ordo_friend_requests set user_a=least(caller,target), user_b=greatest(caller,target),
      requested_by=caller, status='pending', updated_at=now() where id=existing.id;
    return 'pending';
  end if;
  insert into public.ordo_friend_requests(user_a,user_b,requested_by)
    values (least(caller,target),greatest(caller,target),caller);
  return 'pending';
end;
$$;
revoke all on function public.ordo_request_friend(text) from public, anon;
grant execute on function public.ordo_request_friend(text) to authenticated;

create or replace function public.ordo_respond_friend_request(p_request_id uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); result text;
begin
  if caller is null then raise exception 'Sign in required'; end if;
  update public.ordo_friend_requests set status=case when p_accept then 'accepted' else 'rejected' end,
    updated_at=now()
    where id=p_request_id and (user_a=caller or user_b=caller)
      and (not p_accept or requested_by <> caller) and status='pending'
    returning status into result;
  if result is null then raise exception 'Friend request not found'; end if;
  return result;
end;
$$;
revoke all on function public.ordo_respond_friend_request(uuid,boolean) from public, anon;
grant execute on function public.ordo_respond_friend_request(uuid,boolean) to authenticated;

-- Only accepted friends can create or open a direct conversation.
create or replace function public.ordo_open_direct_chat(other_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); chat_id uuid;
begin
  if current_user_id is null or other_user is null or current_user_id = other_user then
    raise exception 'A different signed-in user is required';
  end if;
  if not exists (select 1 from public.ordo_friend_requests r
    where r.user_a=least(current_user_id,other_user) and r.user_b=greatest(current_user_id,other_user)
      and r.status='accepted') then raise exception 'Friend request must be accepted first'; end if;
  insert into public.ordo_direct_chats (user_a, user_b)
    values (least(current_user_id, other_user), greatest(current_user_id, other_user))
    on conflict (user_a, user_b) do nothing;
  select c.id into chat_id from public.ordo_direct_chats c
    where c.user_a = least(current_user_id, other_user)
      and c.user_b = greatest(current_user_id, other_user);
  return chat_id;
end;
$$;
revoke all on function public.ordo_open_direct_chat(uuid) from public, anon;
grant execute on function public.ordo_open_direct_chat(uuid) to authenticated;
