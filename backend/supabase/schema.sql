-- Run this in your Supabase SQL Editor
-- Passwords remain in Supabase Auth only; Supabase stores hashed credentials in auth.users.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
   role text not null check (role in ('guardian', 'staff', 'admin', 'parent')),
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  child_first_name text not null,
  child_last_name text not null,
  program text not null default 'Pre-Kindergarten 1',
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'Waitlisted')),
  role text not null default 'Student',
  form_data jsonb not null default '{}'::jsonb,
  requirements jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now()
);

create table if not exists public.site_content (
  key text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete set null,
  sender_name text not null,
  sender_email text not null,
  sender_phone text,
  subject text not null default 'General Inquiry',
  body text not null,
  status text not null default 'New' check (status in ('New', 'Replied', 'Closed')),
  replies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  actor_name text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_enrollments_parent_submitted_at on public.enrollments(parent_id, submitted_at desc);
create index if not exists idx_enrollments_status on public.enrollments(status);
create index if not exists idx_enrollments_program on public.enrollments(program);
create index if not exists idx_enrollments_submitted_at on public.enrollments(submitted_at desc);
create index if not exists idx_enrollments_section on public.enrollments ((form_data ->> 'section'));
create index if not exists idx_contact_messages_sender_updated_at on public.contact_messages(sender_id, updated_at desc);
create index if not exists idx_contact_messages_status_updated_at on public.contact_messages(status, updated_at desc);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);
create index if not exists idx_activity_logs_entity_created_at on public.activity_logs(entity_type, created_at desc);
create index if not exists idx_activity_logs_actor_created_at on public.activity_logs(actor_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;
alter table public.site_content enable row level security;
alter table public.contact_messages enable row level security;
alter table public.activity_logs enable row level security;

create or replace function public.current_app_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  with role_sources as (
    select
      nullif(auth.jwt() -> 'user_metadata' ->> 'role', '') as jwt_role,
      (select nullif(p.role, '') from public.profiles p where p.id = auth.uid() limit 1) as profile_role
  )
  select case
    when jwt_role in ('staff', 'admin') then jwt_role
    when profile_role in ('staff', 'admin') then profile_role
    when profile_role is not null then profile_role
    when jwt_role is not null then jwt_role
    else 'guardian'
  end
  from role_sources;
$$;

grant execute on function public.current_app_role() to authenticated;

-- Profiles policies
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can read all profiles
-- Staff/Admin can read all profiles
drop policy if exists "Staff or Admin can read all profiles" on public.profiles;
create policy "Staff or Admin can read all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.current_app_role() in ('staff', 'admin'));

-- Enrollments policies
drop policy if exists "Parents can read own enrollments" on public.enrollments;
create policy "Parents can read own enrollments"
  on public.enrollments
  for select
  to authenticated
  using (auth.uid() = parent_id);

drop policy if exists "Parents can insert own enrollments" on public.enrollments;
create policy "Parents can insert own enrollments"
  on public.enrollments
  for insert
  to authenticated
  with check (auth.uid() = parent_id);

drop policy if exists "Parents can update own enrollments" on public.enrollments;
create policy "Parents can update own enrollments"
  on public.enrollments
  for update
  to authenticated
  using (auth.uid() = parent_id)
  with check (auth.uid() = parent_id);

drop policy if exists "Parents can delete own enrollments" on public.enrollments;
create policy "Parents can delete own enrollments"
  on public.enrollments
  for delete
  to authenticated
  using (auth.uid() = parent_id);

-- Staff/Admin can read all enrollments
drop policy if exists "Staff or Admin can read all enrollments" on public.enrollments;
create policy "Staff or Admin can read all enrollments"
  on public.enrollments
  for select
  to authenticated
  using (public.current_app_role() in ('staff', 'admin'));

drop policy if exists "Staff or Admin can update enrollments" on public.enrollments;
create policy "Staff or Admin can update enrollments"
  on public.enrollments
  for update
  to authenticated
  using (public.current_app_role() in ('staff', 'admin'))
  with check (public.current_app_role() in ('staff', 'admin'));

drop policy if exists "Staff or Admin can delete enrollments" on public.enrollments;
create policy "Staff or Admin can delete enrollments"
  on public.enrollments
  for delete
  to authenticated
  using (public.current_app_role() in ('staff', 'admin'));

-- Site content policies
drop policy if exists "Anyone can read site content" on public.site_content;
create policy "Anyone can read site content"
  on public.site_content
  for select
  to authenticated
  using (true);

drop policy if exists "Staff or Admin can insert site content" on public.site_content;
create policy "Staff or Admin can insert site content"
  on public.site_content
  for insert
  to authenticated
  with check (public.current_app_role() in ('staff', 'admin'));

drop policy if exists "Staff or Admin can update site content" on public.site_content;
create policy "Staff or Admin can update site content"
  on public.site_content
  for update
  to authenticated
  using (public.current_app_role() in ('staff', 'admin'))
  with check (public.current_app_role() in ('staff', 'admin'));

drop policy if exists "Users can create own contact messages" on public.contact_messages;
create policy "Users can create own contact messages"
  on public.contact_messages
  for insert
  to authenticated
  with check (sender_id = auth.uid() or sender_id is null);

drop policy if exists "Users can read own contact messages" on public.contact_messages;
create policy "Users can read own contact messages"
  on public.contact_messages
  for select
  to authenticated
  using (sender_id = auth.uid());

drop policy if exists "Users can update own contact messages" on public.contact_messages;
create policy "Users can update own contact messages"
  on public.contact_messages
  for update
  to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

drop policy if exists "Staff or Admin can read all contact messages" on public.contact_messages;
create policy "Staff or Admin can read all contact messages"
  on public.contact_messages
  for select
  to authenticated
  using (public.current_app_role() in ('staff', 'admin'));

drop policy if exists "Staff or Admin can update contact messages" on public.contact_messages;
create policy "Staff or Admin can update contact messages"
  on public.contact_messages
  for update
  to authenticated
  using (public.current_app_role() in ('staff', 'admin'))
  with check (public.current_app_role() in ('staff', 'admin'));

drop policy if exists "Staff or Admin can read activity logs" on public.activity_logs;
create policy "Staff or Admin can read activity logs"
  on public.activity_logs
  for select
  to authenticated
  using (public.current_app_role() in ('staff', 'admin'));

drop policy if exists "Staff or Admin can insert activity logs" on public.activity_logs;
create policy "Staff or Admin can insert activity logs"
  on public.activity_logs
  for insert
  to authenticated
  with check (
    public.current_app_role() in ('staff', 'admin')
    and (actor_id is null or actor_id = auth.uid())
    and coalesce(actor_role, public.current_app_role()) in ('staff', 'admin')
  );

create or replace function public.app_encryption_key()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  encryption_key text := nullif(current_setting('app.settings.encryption_key', true), '');
begin
  return encryption_key;
end;
$$;

create or replace function public.encrypt_sensitive_form_data(input_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb := coalesce(input_data, '{}'::jsonb);
  encryption_key text := public.app_encryption_key();
  sensitive_key text;
  sensitive_keys constant text[] := array[
    'incomeSourceCategory',
    'incomeSourceCategoryOther',
    'monthlyIncome',
    'healthConcerns'
  ];
  current_value jsonb;
begin
  if encryption_key is null then
    return result;
  end if;

  foreach sensitive_key in array sensitive_keys loop
    if result ? sensitive_key then
      current_value := result -> sensitive_key;

      if current_value is not null
        and jsonb_typeof(current_value) <> 'null'
        and not (jsonb_typeof(current_value) = 'object' and current_value ? '__encrypted') then
        result := jsonb_set(
          result,
          array[sensitive_key],
          jsonb_build_object(
            '__encrypted', true,
            'ciphertext', encode(
              pgp_sym_encrypt(current_value::text, encryption_key, 'cipher-algo=aes256, compress-algo=1'),
              'base64'
            )
          ),
          true
        );
      end if;
    end if;
  end loop;

  return result;
end;
$$;

create or replace function public.decrypt_sensitive_form_data(input_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb := coalesce(input_data, '{}'::jsonb);
  encryption_key text := public.app_encryption_key();
  sensitive_key text;
  sensitive_keys constant text[] := array[
    'incomeSourceCategory',
    'incomeSourceCategoryOther',
    'monthlyIncome',
    'healthConcerns'
  ];
  current_value jsonb;
  decrypted_value text;
begin
  if encryption_key is null then
    return result;
  end if;

  foreach sensitive_key in array sensitive_keys loop
    if result ? sensitive_key then
      current_value := result -> sensitive_key;

      if jsonb_typeof(current_value) = 'object'
        and current_value ? '__encrypted'
        and current_value ->> '__encrypted' = 'true'
        and current_value ? 'ciphertext' then
        decrypted_value := pgp_sym_decrypt(
          decode(current_value ->> 'ciphertext', 'base64'),
          encryption_key
        );

        result := jsonb_set(result, array[sensitive_key], decrypted_value::jsonb, true);
      end if;
    end if;
  end loop;

  return result;
end;
$$;

create or replace function public.set_enrollment_form_data_encryption()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.form_data := public.encrypt_sensitive_form_data(new.form_data);
  return new;
end;
$$;

drop trigger if exists tr_encrypt_enrollment_form_data on public.enrollments;
create trigger tr_encrypt_enrollment_form_data
before insert or update of form_data on public.enrollments
for each row execute function public.set_enrollment_form_data_encryption();

create or replace function public.get_enrollments_secure()
returns table (
  id uuid,
  parent_id uuid,
  child_first_name text,
  child_last_name text,
  program text,
  status text,
  role text,
  form_data jsonb,
  requirements jsonb,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_role text := public.current_app_role();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    e.id,
    e.parent_id,
    e.child_first_name,
    e.child_last_name,
    e.program,
    e.status,
    e.role,
    public.decrypt_sensitive_form_data(e.form_data) as form_data,
    e.requirements,
    e.submitted_at
  from public.enrollments e
  where current_role in ('staff', 'admin') or e.parent_id = current_user_id
  order by e.submitted_at desc;
end;
$$;

grant execute on function public.get_enrollments_secure() to authenticated;

create or replace function public.restore_backup_bundle(restore_bundle jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_role text := public.current_app_role();
  actor_name text := coalesce(
    (select p.full_name from public.profiles p where p.id = current_user_id limit 1),
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    'Unknown Admin'
  );
  tables_payload jsonb := case
    when jsonb_typeof(restore_bundle -> 'tables') = 'object' then restore_bundle -> 'tables'
    when jsonb_typeof(restore_bundle) = 'object' then restore_bundle
    else '{}'::jsonb
  end;
  profile_row jsonb;
  enrollment_row jsonb;
  site_content_row jsonb;
  contact_message_row jsonb;
  activity_log_row jsonb;
  profiles_count integer := 0;
  enrollments_count integer := 0;
  site_content_count integer := 0;
  contact_messages_count integer := 0;
  activity_logs_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if current_role <> 'admin' then
    raise exception 'Admin access required';
  end if;

  for profile_row in
    select value from jsonb_array_elements(coalesce(tables_payload -> 'profiles', '[]'::jsonb))
  loop
    if coalesce(profile_row ->> 'id', '') = '' then
      continue;
    end if;

    insert into public.profiles (id, full_name, first_name, middle_name, last_name, suffix, role, phone, created_at)
    values (
      (profile_row ->> 'id')::uuid,
      coalesce(nullif(profile_row ->> 'full_name', ''), 'Unknown User'),
      nullif(profile_row ->> 'first_name', ''),
      nullif(profile_row ->> 'middle_name', ''),
      nullif(profile_row ->> 'last_name', ''),
      nullif(profile_row ->> 'suffix', ''),
      coalesce(nullif(profile_row ->> 'role', ''), 'guardian'),
      nullif(profile_row ->> 'phone', ''),
      coalesce(nullif(profile_row ->> 'created_at', '')::timestamptz, now())
    )
    on conflict (id) do update set
      full_name = excluded.full_name,
      first_name = excluded.first_name,
      middle_name = excluded.middle_name,
      last_name = excluded.last_name,
      suffix = excluded.suffix,
      role = excluded.role,
      phone = excluded.phone,
      created_at = excluded.created_at;

    profiles_count := profiles_count + 1;
  end loop;

  for site_content_row in
    select value from jsonb_array_elements(coalesce(tables_payload -> 'site_content', '[]'::jsonb))
  loop
    if coalesce(site_content_row ->> 'key', '') = '' then
      continue;
    end if;

    insert into public.site_content (key, content, updated_at)
    values (
      site_content_row ->> 'key',
      coalesce(site_content_row -> 'content', '{}'::jsonb),
      coalesce(nullif(site_content_row ->> 'updated_at', '')::timestamptz, now())
    )
    on conflict (key) do update set
      content = excluded.content,
      updated_at = excluded.updated_at;

    site_content_count := site_content_count + 1;
  end loop;

  for contact_message_row in
    select value from jsonb_array_elements(coalesce(tables_payload -> 'contact_messages', '[]'::jsonb))
  loop
    if coalesce(contact_message_row ->> 'id', '') = '' then
      continue;
    end if;

    insert into public.contact_messages (
      id,
      sender_id,
      sender_name,
      sender_email,
      sender_phone,
      subject,
      body,
      status,
      replies,
      created_at,
      updated_at
    )
    values (
      (contact_message_row ->> 'id')::uuid,
      nullif(contact_message_row ->> 'sender_id', '')::uuid,
      coalesce(nullif(contact_message_row ->> 'sender_name', ''), 'Unknown Sender'),
      coalesce(nullif(contact_message_row ->> 'sender_email', ''), 'unknown@example.com'),
      nullif(contact_message_row ->> 'sender_phone', ''),
      coalesce(nullif(contact_message_row ->> 'subject', ''), 'General Inquiry'),
      coalesce(nullif(contact_message_row ->> 'body', ''), ''),
      coalesce(nullif(contact_message_row ->> 'status', ''), 'New'),
      coalesce(contact_message_row -> 'replies', '[]'::jsonb),
      coalesce(nullif(contact_message_row ->> 'created_at', '')::timestamptz, now()),
      coalesce(nullif(contact_message_row ->> 'updated_at', '')::timestamptz, now())
    )
    on conflict (id) do update set
      sender_id = excluded.sender_id,
      sender_name = excluded.sender_name,
      sender_email = excluded.sender_email,
      sender_phone = excluded.sender_phone,
      subject = excluded.subject,
      body = excluded.body,
      status = excluded.status,
      replies = excluded.replies,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at;

    contact_messages_count := contact_messages_count + 1;
  end loop;

  for enrollment_row in
    select value from jsonb_array_elements(coalesce(tables_payload -> 'enrollments', '[]'::jsonb))
  loop
    if coalesce(enrollment_row ->> 'id', '') = '' or coalesce(enrollment_row ->> 'parent_id', '') = '' then
      continue;
    end if;

    insert into public.enrollments (
      id,
      parent_id,
      child_first_name,
      child_last_name,
      program,
      status,
      role,
      form_data,
      requirements,
      submitted_at
    )
    values (
      (enrollment_row ->> 'id')::uuid,
      (enrollment_row ->> 'parent_id')::uuid,
      coalesce(nullif(enrollment_row ->> 'child_first_name', ''), 'Unknown'),
      coalesce(nullif(enrollment_row ->> 'child_last_name', ''), 'Student'),
      coalesce(nullif(enrollment_row ->> 'program', ''), 'Pre-Kindergarten 1'),
      coalesce(nullif(enrollment_row ->> 'status', ''), 'Pending'),
      coalesce(nullif(enrollment_row ->> 'role', ''), 'Student'),
      coalesce(enrollment_row -> 'form_data', '{}'::jsonb),
      coalesce(enrollment_row -> 'requirements', '[]'::jsonb),
      coalesce(nullif(enrollment_row ->> 'submitted_at', '')::timestamptz, now())
    )
    on conflict (id) do update set
      parent_id = excluded.parent_id,
      child_first_name = excluded.child_first_name,
      child_last_name = excluded.child_last_name,
      program = excluded.program,
      status = excluded.status,
      role = excluded.role,
      form_data = excluded.form_data,
      requirements = excluded.requirements,
      submitted_at = excluded.submitted_at;

    enrollments_count := enrollments_count + 1;
  end loop;

  for activity_log_row in
    select value from jsonb_array_elements(coalesce(tables_payload -> 'activity_logs', '[]'::jsonb))
  loop
    if coalesce(activity_log_row ->> 'id', '') = '' then
      continue;
    end if;

    insert into public.activity_logs (id, actor_id, actor_role, actor_name, action, entity_type, entity_id, details, created_at)
    values (
      (activity_log_row ->> 'id')::uuid,
      nullif(activity_log_row ->> 'actor_id', '')::uuid,
      nullif(activity_log_row ->> 'actor_role', ''),
      nullif(activity_log_row ->> 'actor_name', ''),
      coalesce(nullif(activity_log_row ->> 'action', ''), 'restore_record'),
      coalesce(nullif(activity_log_row ->> 'entity_type', ''), 'system_maintenance'),
      coalesce(nullif(activity_log_row ->> 'entity_id', ''), gen_random_uuid()::text),
      coalesce(activity_log_row -> 'details', '{}'::jsonb),
      coalesce(nullif(activity_log_row ->> 'created_at', '')::timestamptz, now())
    )
    on conflict (id) do update set
      actor_id = excluded.actor_id,
      actor_role = excluded.actor_role,
      actor_name = excluded.actor_name,
      action = excluded.action,
      entity_type = excluded.entity_type,
      entity_id = excluded.entity_id,
      details = excluded.details,
      created_at = excluded.created_at;

    activity_logs_count := activity_logs_count + 1;
  end loop;

  insert into public.activity_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
  values (
    current_user_id,
    current_role,
    actor_name,
    'restore_backup_bundle',
    'system_maintenance',
    coalesce(restore_bundle ->> 'exportedAt', restore_bundle ->> 'generatedAt', gen_random_uuid()::text),
    jsonb_build_object(
      'profiles', profiles_count,
      'enrollments', enrollments_count,
      'site_content', site_content_count,
      'contact_messages', contact_messages_count,
      'activity_logs', activity_logs_count
    )
  );

  return jsonb_build_object(
    'profiles', profiles_count,
    'enrollments', enrollments_count,
    'site_content', site_content_count,
    'contact_messages', contact_messages_count,
    'activity_logs', activity_logs_count,
    'total', profiles_count + enrollments_count + site_content_count + contact_messages_count + activity_logs_count
  );
end;
$$;

grant execute on function public.restore_backup_bundle(jsonb) to authenticated;

create or replace function public.log_staff_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_uid uuid := auth.uid();
  actor_profile_id uuid := (select p.id from public.profiles p where p.id = auth.uid() limit 1);
  actor_role text := coalesce(public.current_app_role(), 'unknown');
  actor_name text := coalesce(
    (select p.full_name from public.profiles p where p.id = actor_uid limit 1),
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    'Unknown User'
  );
  old_section text := null;
  new_section text := null;
  old_announcements_ids text[] := array[]::text[];
  new_announcements_ids text[] := array[]::text[];
  added_announcements_count integer := 0;
  removed_announcements_count integer := 0;
begin
  if actor_role not in ('staff', 'admin') then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'site_content' then
    if tg_op = 'INSERT' and new.key in ('homepage', 'contact-page', 'age-rules') then
      insert into public.activity_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
      values (
        actor_profile_id,
        actor_role,
        actor_name,
        'create_content',
        'site_content',
        new.key,
        jsonb_build_object('key', new.key, 'operation', tg_op)
      );
    elsif tg_op = 'UPDATE' and new.key in ('homepage', 'contact-page', 'age-rules') and new.content is distinct from old.content then
      if new.key = 'homepage' then
        if
          new.content ->> 'heroEyebrow' is distinct from old.content ->> 'heroEyebrow' or
          new.content ->> 'heroTitle' is distinct from old.content ->> 'heroTitle' or
          new.content ->> 'heroDescription' is distinct from old.content ->> 'heroDescription' or
          new.content ->> 'heroImageUrl' is distinct from old.content ->> 'heroImageUrl'
        then
          insert into public.activity_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
          values (
            actor_profile_id,
            actor_role,
            actor_name,
            'edit_homepage_hero_content',
            'site_content',
            new.key,
            jsonb_build_object('key', new.key)
          );
        end if;

        if new.content -> 'highlights' is distinct from old.content -> 'highlights' then
          insert into public.activity_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
          values (
            actor_profile_id,
            actor_role,
            actor_name,
            'edit_homepage_highlight_cards',
            'site_content',
            new.key,
            jsonb_build_object('key', new.key)
          );
        end if;

        if
          new.content ->> 'flowTitle' is distinct from old.content ->> 'flowTitle' or
          new.content ->> 'flowDescription' is distinct from old.content ->> 'flowDescription' or
          new.content ->> 'quickActionTitle' is distinct from old.content ->> 'quickActionTitle' or
          new.content ->> 'quickActionDescription' is distinct from old.content ->> 'quickActionDescription'
        then
          insert into public.activity_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
          values (
            actor_profile_id,
            actor_role,
            actor_name,
            'edit_homepage_portal_sections',
            'site_content',
            new.key,
            jsonb_build_object('key', new.key)
          );
        end if;

        if
          new.content ->> 'announcementsTitle' is distinct from old.content ->> 'announcementsTitle' or
          new.content ->> 'announcementsIntro' is distinct from old.content ->> 'announcementsIntro'
        then
          insert into public.activity_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
          values (
            actor_profile_id,
            actor_role,
            actor_name,
            'edit_homepage_announcements',
            'site_content',
            new.key,
            jsonb_build_object('key', new.key)
          );
        end if;

        if new.content -> 'announcements' is distinct from old.content -> 'announcements' then
          select coalesce(array_agg(item ->> 'id'), array[]::text[])
          into old_announcements_ids
          from jsonb_array_elements(coalesce(old.content -> 'announcements', '[]'::jsonb)) as item
          where item ? 'id';

          select coalesce(array_agg(item ->> 'id'), array[]::text[])
          into new_announcements_ids
          from jsonb_array_elements(coalesce(new.content -> 'announcements', '[]'::jsonb)) as item
          where item ? 'id';

          select count(*) into added_announcements_count
          from unnest(new_announcements_ids) as id
          where not (id = any(old_announcements_ids));

          select count(*) into removed_announcements_count
          from unnest(old_announcements_ids) as id
          where not (id = any(new_announcements_ids));

          if added_announcements_count > 0 then
            insert into public.activity_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
            values (
              actor_profile_id,
              actor_role,
              actor_name,
              'add_homepage_announcement',
              'site_content',
              new.key,
              jsonb_build_object('key', new.key, 'count', added_announcements_count)
            );
          end if;

          if removed_announcements_count > 0 then
            insert into public.activity_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
            values (
              actor_profile_id,
              actor_role,
              actor_name,
              'delete_homepage_announcement',
              'site_content',
              new.key,
              jsonb_build_object('key', new.key, 'count', removed_announcements_count)
            );
          end if;

          if added_announcements_count = 0 and removed_announcements_count = 0 then
            insert into public.activity_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
            values (
              actor_profile_id,
              actor_role,
              actor_name,
              'edit_homepage_announcements',
              'site_content',
              new.key,
              jsonb_build_object('key', new.key)
            );
          end if;
        end if;
      else
        if new.key = 'contact-page' then
          insert into public.activity_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
          values (
            actor_profile_id,
            actor_role,
            actor_name,
            'edit_contact_page_details',
            'site_content',
            new.key,
            jsonb_build_object('key', new.key)
          );
        elsif new.key = 'age-rules' then
          insert into public.activity_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
          values (
            actor_profile_id,
            actor_role,
            actor_name,
            'update_age_rules',
            'site_content',
            new.key,
            jsonb_build_object('key', new.key)
          );
        else
        insert into public.activity_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
        values (
          actor_profile_id,
          actor_role,
          actor_name,
          'update_content',
          'site_content',
          new.key,
          jsonb_build_object('key', new.key, 'operation', tg_op)
        );
        end if;
      end if;
    end if;
  elsif tg_table_name = 'contact_messages' then
    if tg_op = 'UPDATE' and (new.status is distinct from old.status or new.replies is distinct from old.replies) then
      insert into public.activity_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
      values (
        actor_profile_id,
        actor_role,
        actor_name,
        'update_contact_message',
        'contact_message',
        new.id::text,
        jsonb_build_object(
          'subject', new.subject,
          'old_status', old.status,
          'new_status', new.status,
          'reply_count', jsonb_array_length(coalesce(new.replies, '[]'::jsonb))
        )
      );
    end if;
  elsif tg_table_name = 'enrollments' then
    old_section := nullif(trim(coalesce(old.form_data ->> 'section', '')), '');
    new_section := nullif(trim(coalesce(new.form_data ->> 'section', '')), '');

    if tg_op = 'UPDATE' and (new.status is distinct from old.status or new_section is distinct from old_section) then
      insert into public.activity_logs (actor_id, actor_role, actor_name, action, entity_type, entity_id, details)
      values (
        actor_profile_id,
        actor_role,
        actor_name,
        'update_enrollment',
        'enrollment',
        new.id::text,
        jsonb_build_object(
          'child_first_name', new.child_first_name,
          'child_last_name', new.child_last_name,
          'program', new.program,
          'old_status', old.status,
          'new_status', new.status,
          'old_section', old_section,
          'new_section', new_section
        )
      );
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_log_site_content_activity on public.site_content;
create trigger tr_log_site_content_activity
after insert or update on public.site_content
for each row execute function public.log_staff_activity();

drop trigger if exists tr_log_contact_message_activity on public.contact_messages;
create trigger tr_log_contact_message_activity
after update on public.contact_messages
for each row execute function public.log_staff_activity();

drop trigger if exists tr_log_enrollment_activity on public.enrollments;
create trigger tr_log_enrollment_activity
after update on public.enrollments
for each row execute function public.log_staff_activity();

insert into public.site_content (key, content)
values (
  'homepage',
  jsonb_build_object(
    'heroEyebrow', 'St. Joseph Daycare Center',
    'heroTitle', 'Our School',
    'heroDescription', 'Enrollment, requirements, and status tracking in one portal.',
    'heroImageUrl', '',
    'highlights', jsonb_build_array(
      jsonb_build_object('id', 'highlight-1', 'title', 'Mayor Kit Nieto', 'subtitle', 'Community Partner', 'imageUrl', ''),
      jsonb_build_object('id', 'highlight-2', 'title', 'Scouting', 'subtitle', 'Student Activities', 'imageUrl', ''),
      jsonb_build_object('id', 'highlight-3', 'title', 'Principal', 'subtitle', 'Welcome Message', 'imageUrl', ''),
      jsonb_build_object('id', 'highlight-4', 'title', 'Toothbrush Day', 'subtitle', 'Health Program', 'imageUrl', '')
    ),
    'announcementsTitle', 'Announcements',
    'announcementsIntro', 'Latest school updates and notices for families.',
    'announcements', jsonb_build_array(
      jsonb_build_object('id', 'announcement-1', 'title', 'Enrollment Is Open', 'body', 'Families may now submit new applications and upload requirements through the portal.', 'dateLabel', 'This Week'),
      jsonb_build_object('id', 'announcement-2', 'title', 'Parent Orientation', 'body', 'A parent orientation schedule will be posted after initial application review.', 'dateLabel', 'Upcoming')
    ),
    'flowTitle', 'Complete Enrollment Steps',
    'flowDescription', 'Follow these steps to complete your child''s application.',
    'quickActionTitle', 'Enroll Now',
    'quickActionDescription', 'Start a new enrollment form for your child.'
  )
)
on conflict (key) do nothing;

insert into public.site_content (key, content)
values (
  'contact-page',
  jsonb_build_object(
    'pageTitle', 'Contact Us',
    'pageDescription', 'Get in touch with the school administration.',
    'formTitle', 'Send a Message',
    'formDescription', 'Share your questions, concerns, or requests with the staff.',
    'administratorLabel', 'Administrator',
    'administratorName', 'Mrs. Maggie Radam-Silais',
    'phone', '+63 977 098 3240',
    'email', 'stjosephes.cainta2a@gmail.com',
    'address', 'Cainta, Rizal, Philippines',
    'officeHours', 'Monday to Friday, 8:00 AM to 5:00 PM'
  )
)
on conflict (key) do nothing;

insert into public.site_content (key, content)
values (
  'age-rules',
  jsonb_build_array(
    jsonb_build_object(
      'id', 'ited',
      'name', 'ITEd (Infant/Toddler)',
      'ageLabel', 'Birth to 2 years 11 months',
      'scheduleLabel', 'Monday - Friday',
      'timeLabel', 'Daycare Guided Routine',
      'minMonths', 0,
      'maxMonths', 35
    ),
    jsonb_build_object(
      'id', 'prek1',
      'name', 'Pre-Kindergarten 1',
      'ageLabel', '3 years old only',
      'scheduleLabel', 'Monday - Friday',
      'timeLabel', '8:00 AM - 11:00 AM',
      'minMonths', 36,
      'maxMonths', 47
    ),
    jsonb_build_object(
      'id', 'prek2',
      'name', 'Pre-Kindergarten 2',
      'ageLabel', '4 to 5 years old',
      'scheduleLabel', 'Monday - Friday',
      'timeLabel', 'Schedule assigned by school',
      'minMonths', 48,
      'maxMonths', 71
    )
  )
)
on conflict (key) do nothing;

-- Storage: requirements documents (private bucket + signed URL access)
insert into storage.buckets (id, name, public)
values ('requirements', 'requirements', false)
on conflict (id) do nothing;

drop policy if exists "Guardians can upload own requirement files" on storage.objects;
create policy "Guardians can upload own requirement files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'requirements'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Guardians can read own requirement files" on storage.objects;
create policy "Guardians can read own requirement files"
on storage.objects for select to authenticated
using (
  bucket_id = 'requirements'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Staff or Admin can read requirement files" on storage.objects;
create policy "Staff or Admin can read requirement files"
on storage.objects for select to authenticated
using (
  bucket_id = 'requirements'
  and public.current_app_role() in ('staff', 'admin')
);

drop policy if exists "Admin can upload requirement files" on storage.objects;
create policy "Admin can upload requirement files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'requirements'
  and public.current_app_role() = 'admin'
);

drop policy if exists "Admin can update requirement files" on storage.objects;
create policy "Admin can update requirement files"
on storage.objects for update to authenticated
using (
  bucket_id = 'requirements'
  and public.current_app_role() = 'admin'
)
with check (
  bucket_id = 'requirements'
  and public.current_app_role() = 'admin'
);

drop policy if exists "Admin can delete requirement files" on storage.objects;
create policy "Admin can delete requirement files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'requirements'
  and public.current_app_role() = 'admin'
);

-- Storage: enrollment files (private bucket + signed URL access)
insert into storage.buckets (id, name, public)
values ('enrollment-files', 'enrollment-files', false)
on conflict (id) do nothing;

drop policy if exists "Guardians can upload own enrollment files" on storage.objects;
create policy "Guardians can upload own enrollment files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'enrollment-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Guardians can read own enrollment files" on storage.objects;
create policy "Guardians can read own enrollment files"
on storage.objects for select to authenticated
using (
  bucket_id = 'enrollment-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Staff or Admin can read enrollment files" on storage.objects;
create policy "Staff or Admin can read enrollment files"
on storage.objects for select to authenticated
using (
  bucket_id = 'enrollment-files'
  and public.current_app_role() in ('staff', 'admin')
);

drop policy if exists "Admin can upload enrollment files" on storage.objects;
create policy "Admin can upload enrollment files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'enrollment-files'
  and public.current_app_role() = 'admin'
);

drop policy if exists "Admin can update enrollment files" on storage.objects;
create policy "Admin can update enrollment files"
on storage.objects for update to authenticated
using (
  bucket_id = 'enrollment-files'
  and public.current_app_role() = 'admin'
)
with check (
  bucket_id = 'enrollment-files'
  and public.current_app_role() = 'admin'
);

drop policy if exists "Admin can delete enrollment files" on storage.objects;
create policy "Admin can delete enrollment files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'enrollment-files'
  and public.current_app_role() = 'admin'
);

