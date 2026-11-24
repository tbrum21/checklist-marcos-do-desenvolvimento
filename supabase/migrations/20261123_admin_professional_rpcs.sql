create or replace function public.admin_generate_temp_password()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  v_bytes bytea := extensions.gen_random_bytes(8);
  v_out text := 'Marcos@';
  v_i integer;
begin
  for v_i in 0..7 loop
    v_out := v_out || substr(v_alphabet, (get_byte(v_bytes, v_i) % length(v_alphabet)) + 1, 1);
  end loop;
  return v_out;
end;
$$;

revoke all on function public.admin_generate_temp_password() from public, anon, authenticated;

create or replace function public.admin_assert_superadmin()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ok boolean;
begin
  if v_uid is null then
    raise exception 'Não autenticado.';
  end if;
  select exists (
    select 1 from public.profiles
    where id = v_uid
      and role = 'superadmin'
      and active = true
  ) into v_ok;
  if not v_ok then
    raise exception 'Acesso restrito ao superadmin.';
  end if;
  return v_uid;
end;
$$;

revoke all on function public.admin_assert_superadmin() from public, anon, authenticated;

create or replace function public.admin_list_professionals()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform public.admin_assert_superadmin();

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'full_name', p.full_name,
        'crp', p.crp,
        'role', p.role,
        'must_change_password', p.must_change_password,
        'active', p.active,
        'created_at', p.created_at,
        'patient_count', coalesce(pt.cnt, 0),
        'assessment_count', coalesce(a.cnt, 0)
      )
      order by p.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.profiles p
  left join (
    select professional_id, count(*)::int as cnt
    from public.patients
    group by professional_id
  ) pt on pt.professional_id = p.id
  left join (
    select professional_id, count(*)::int as cnt
    from public.assessments
    group by professional_id
  ) a on a.professional_id = p.id;

  return jsonb_build_object('professionals', v_result);
end;
$$;

revoke all on function public.admin_list_professionals() from public, anon;
grant execute on function public.admin_list_professionals() to authenticated;

create or replace function public.admin_create_professional(
  p_full_name text,
  p_email text,
  p_crp text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := trim(coalesce(p_full_name, ''));
  v_crp text := trim(coalesce(p_crp, ''));
  v_user_id uuid := gen_random_uuid();
  v_temp_password text;
  v_now timestamptz := now();
  v_profile public.profiles;
begin
  perform public.admin_assert_superadmin();

  if v_name = '' or v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Informe nome completo e um e-mail válido.';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Já existe uma conta cadastrada com este e-mail.';
  end if;

  v_temp_password := public.admin_generate_temp_password();

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(v_temp_password, extensions.gen_salt('bf')),
    v_now,
    '',
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', v_name, 'crp', v_crp),
    v_now,
    v_now,
    false,
    false
  );

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'full_name', v_name,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    v_now,
    v_now,
    v_now
  );

  insert into public.profiles (id, email, full_name, crp, role, must_change_password, active)
  values (v_user_id, v_email, v_name, v_crp, 'psychologist', true, true)
  returning * into v_profile;

  return jsonb_build_object(
    'professional', jsonb_build_object(
      'id', v_profile.id,
      'email', v_profile.email,
      'full_name', v_profile.full_name,
      'crp', v_profile.crp,
      'role', v_profile.role,
      'must_change_password', v_profile.must_change_password,
      'active', v_profile.active,
      'created_at', v_profile.created_at,
      'patient_count', 0,
      'assessment_count', 0
    ),
    'tempPassword', v_temp_password
  );
end;
$$;

revoke all on function public.admin_create_professional(text, text, text) from public, anon;
grant execute on function public.admin_create_professional(text, text, text) to authenticated;

create or replace function public.admin_reset_professional_password(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_temp_password text;
begin
  perform public.admin_assert_superadmin();

  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Profissional não encontrado.';
  end if;

  v_temp_password := public.admin_generate_temp_password();

  update auth.users
  set encrypted_password = extensions.crypt(v_temp_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = p_user_id;

  update public.profiles
  set must_change_password = true
  where id = p_user_id;

  return jsonb_build_object('tempPassword', v_temp_password);
end;
$$;

revoke all on function public.admin_reset_professional_password(uuid) from public, anon;
grant execute on function public.admin_reset_professional_password(uuid) to authenticated;

create or replace function public.admin_toggle_professional_active(p_user_id uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
begin
  v_caller := public.admin_assert_superadmin();

  if p_user_id is null then
    raise exception 'Profissional não informado.';
  end if;
  if p_user_id = v_caller then
    raise exception 'Você não pode bloquear sua própria conta superadmin.';
  end if;

  update auth.users
  set banned_until = case when p_active then null else '2099-12-31T23:59:59Z'::timestamptz end,
      updated_at = now()
  where id = p_user_id;

  update public.profiles
  set active = p_active
  where id = p_user_id;

  return jsonb_build_object('active', p_active);
end;
$$;

revoke all on function public.admin_toggle_professional_active(uuid, boolean) from public, anon;
grant execute on function public.admin_toggle_professional_active(uuid, boolean) to authenticated;
