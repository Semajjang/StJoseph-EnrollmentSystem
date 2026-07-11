-- Enable Supabase Realtime for the contact messaging chat.
-- Run this once in the Supabase SQL editor. It is idempotent: re-running is safe.
--
-- The portal's Messages screens subscribe to INSERT/UPDATE/DELETE on
-- public.contact_messages to stream new conversations and replies live.
-- Row-level security still applies to the initial fetch; the client also
-- scopes guardians to their own conversations, and falls back to a periodic
-- refetch if Realtime is not enabled.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'contact_messages'
  ) then
    alter publication supabase_realtime add table public.contact_messages;
  end if;
end
$$;

-- Ensure updates carry the full previous row so DELETE/UPDATE payloads are complete.
alter table public.contact_messages replica identity full;
