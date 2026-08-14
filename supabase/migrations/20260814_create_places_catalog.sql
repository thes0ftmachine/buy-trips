create table public.places (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('record', 'food')),
  neighborhood text not null,
  lng numeric not null,
  lat numeric not null,
  rating numeric not null,
  hours text not null,
  specialty text not null,
  photo text not null,
  description text not null,
  meal text check (meal in ('Lunch', 'Dinner')),
  source_url text,
  last_verified_on date,
  created_at timestamptz not null default now()
);

alter table public.places enable row level security;

create policy "Signed-in visitors can read the catalog"
on public.places for select to authenticated using (true);

insert into public.places (id, name, kind, neighborhood, lng, lat, rating, hours, specialty, photo, description, meal, last_verified_on) values
('mm', 'Music Millennium', 'record', 'Laurelhurst', -122.639, 45.522, 4.7, 'Check store hours', 'New releases Â· Local artists', 'ðŸŽ§', 'An all-purpose Portland institution with deep new-vinyl bins and an excellent local music wall.', null, current_date),
('lr', 'Little Axe Records', 'record', 'Northwest', -122.694, 45.532, 4.8, 'Check store hours', 'Soul Â· Jazz Â· Rare groove', 'ðŸ’¿', 'Small, selective shop for adventurous digging: private press, international funk, and heavyweight jazz.', null, current_date),
('ec', 'Everyday Music', 'record', 'Hawthorne', -122.623, 45.512, 4.5, 'Check store hours', 'Used vinyl Â· CDs Â· Books', 'ðŸ“€', 'A high-volume used-media stop where patient crate digging pays off.', null, current_date),
('mr', 'Mississippi Records', 'record', 'Boise', -122.675, 45.551, 4.8, 'Check store hours', 'Folk Â· Blues Â· Global', 'ðŸª•', 'Beautifully curated records, reissues, and esoteric gems from around the world.', null, current_date),
('lu', 'Luc Lac Vietnamese Kitchen', 'food', 'Downtown', -122.678, 45.518, 4.6, 'Check restaurant hours', 'Vietnamese Â· Casual', 'ðŸœ', 'Fast Vietnamese comfort food; great for an easy midday reset.', 'Lunch', current_date),
('jo', 'Janken', 'food', 'Pearl District', -122.683, 45.528, 4.5, 'Check restaurant hours', 'Japanese Â· Steakhouse', 'ðŸ£', 'A polished dinner option close to Northwest digging.', 'Dinner', current_date)
on conflict (id) do update set
  name = excluded.name, neighborhood = excluded.neighborhood, lng = excluded.lng, lat = excluded.lat,
  rating = excluded.rating, hours = excluded.hours, specialty = excluded.specialty, photo = excluded.photo,
  description = excluded.description, meal = excluded.meal, last_verified_on = excluded.last_verified_on;

