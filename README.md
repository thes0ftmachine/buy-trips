# Buy Trips

A mobile-first Portland record-buying trip planner. It includes seeded record-store and food stops, color-coded itinerary pins, priority rankings, and trip notes.

## Run locally

1. Run `npm install`.
2. Run `npm run dev`.

The app uses Leaflet and OpenStreetMap tiles. No map account or token is required.

## Deploy to Vercel

Import the GitHub repository in Vercel and deploy. Vercel recognizes this Vite project automatically.

## Supabase next step

The app supports shared, no-login persistence through Supabase Anonymous Sign-Ins. It falls back to browser storage until you configure Supabase.

1. Create a project in Supabase and enable **Anonymous Sign-Ins** under Authentication settings.
2. In the Supabase SQL Editor, run the migrations in `supabase/migrations/` in order:
   - `20260814_create_trips.sql`
   - `20260814_create_places_catalog.sql`
   - `20260815_shared_trip_links.sql`
   - `20260816_enable_trip_realtime.sql`
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to Vercel (Production, Preview, and Development), then redeploy.

## Sharing a trip

Once Supabase is configured, the first person to open the app gets a trip link like `yourapp.com/?trip=<id>`. Tap the share icon (↗) on any stop's detail sheet to copy that link to your clipboard.

Send that exact URL to the other people planning the trip. Anyone who opens it loads the same trip: same itinerary, same rankings, same notes. Access is controlled by knowing the link's trip ID rather than by an account, so treat the link like you would a shared document link — anyone with it can view and edit.

Changes sync live via Supabase Realtime: when one person adds a stop, changes a priority, or edits a note, everyone else on the same trip link sees it update automatically, no refresh needed.

Without Supabase configured, the app still works, but falls back to private, per-browser storage that isn't shareable.

## Curated catalog

The app loads its Portland catalog from Supabase when configured and falls back to the bundled starter list otherwise. Catalog records are intentionally separate from individual trip data so they can be expanded and maintained without touching anyone's notes or itinerary.
