drop policy "Anonymous users manage only their own trips" on public.trips;

create policy "Anyone with the trip link can read or edit it"
on public.trips
for all
to authenticated
using (true)
with check (true);
