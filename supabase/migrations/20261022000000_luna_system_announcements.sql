-- Browser clients may receive the server's private Broadcast signal for Luna.
-- The event carries only a random announcement id; the message itself remains
-- protected by the application's account-scoped state endpoint.
drop policy if exists "luna_announcement_listeners" on realtime.messages;

create policy "luna_announcement_listeners"
on realtime.messages
for select
to anon
using (
  extension = 'broadcast'
  and realtime.topic() = 'luna-system-announcements'
);
