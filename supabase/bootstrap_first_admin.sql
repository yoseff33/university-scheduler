-- Run this once in Supabase SQL Editor after the intended admin signs in successfully.
-- Replace the UUID below with the user's actual auth.users.id.
-- The block refuses to continue if a super admin already exists.

do $$
declare
  target_user_id uuid := '00000000-0000-0000-0000-000000000000';
begin
  if target_user_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Replace target_user_id before running this script';
  end if;

  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'Target user does not exist in auth.users';
  end if;

  if exists (select 1 from public.user_roles where role = 'super_admin') then
    raise exception 'A super admin already exists. Stop and use the future admin management flow.';
  end if;

  insert into public.user_roles (user_id, role)
  values (target_user_id, 'super_admin')
  on conflict (user_id) do update set role = excluded.role;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
  values (
    target_user_id,
    'first_super_admin_bootstrapped',
    'user_role',
    target_user_id::text,
    jsonb_build_object('role', 'super_admin')
  );
end
$$;
