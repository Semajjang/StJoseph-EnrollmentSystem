-- Run this in your Supabase SQL Editor

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
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
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

alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;
alter table public.site_content enable row level security;
alter table public.contact_messages enable row level security;

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
