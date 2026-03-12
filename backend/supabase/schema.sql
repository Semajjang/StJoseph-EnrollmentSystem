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
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin'));

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
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin'));

drop policy if exists "Staff or Admin can update enrollments" on public.enrollments;
create policy "Staff or Admin can update enrollments"
  on public.enrollments
  for update
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin'))
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin'));

drop policy if exists "Staff or Admin can delete enrollments" on public.enrollments;
create policy "Staff or Admin can delete enrollments"
  on public.enrollments
  for delete
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin'));

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
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin'));

drop policy if exists "Staff or Admin can update site content" on public.site_content;
create policy "Staff or Admin can update site content"
  on public.site_content
  for update
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin'))
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin'));

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
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin'));

drop policy if exists "Staff or Admin can update contact messages" on public.contact_messages;
create policy "Staff or Admin can update contact messages"
  on public.contact_messages
  for update
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin'))
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin'));

drop policy if exists "Staff or Admin can read activity logs" on public.activity_logs;
create policy "Staff or Admin can read activity logs"
  on public.activity_logs
  for select
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin'));

drop policy if exists "Staff or Admin can insert activity logs" on public.activity_logs;
create policy "Staff or Admin can insert activity logs"
  on public.activity_logs
  for insert
  to authenticated
  with check (
    (auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin')
    and (actor_id is null or actor_id = auth.uid())
    and coalesce(actor_role, auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin')
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
  if encryption_key is null then
    raise exception 'app.settings.encryption_key is not configured';
  end if;

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
  current_role text := coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'guardian');
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

create or replace function public.log_staff_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_uid uuid := auth.uid();
  actor_profile_id uuid := (select p.id from public.profiles p where p.id = auth.uid() limit 1);
  actor_role text := coalesce(
    auth.jwt() -> 'user_metadata' ->> 'role',
    (select p.role from public.profiles p where p.id = actor_uid limit 1),
    'unknown'
  );
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
    if tg_op = 'INSERT' and new.key in ('homepage', 'contact-page') then
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
    elsif tg_op = 'UPDATE' and new.key in ('homepage', 'contact-page') and new.content is distinct from old.content then
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
  and (auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin')
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
  and (auth.jwt() -> 'user_metadata' ->> 'role') in ('staff', 'admin')
);

