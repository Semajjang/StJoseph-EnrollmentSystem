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

alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;

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
