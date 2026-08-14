# Buy Trips

A mobile-first Portland record-buying trip planner. It includes seeded record-store and food stops, color-coded itinerary pins, priority rankings, and trip notes.

## Run locally

1. Run `npm install`.
2. Run `npm run dev`.

The app uses Leaflet and OpenStreetMap tiles. No map account or token is required.

## Deploy to Vercel

Import the GitHub repository in Vercel and deploy. Vercel recognizes this Vite project automatically.

## Supabase next step

The app supports private, no-login persistence through Supabase Anonymous Sign-Ins. It falls back to browser storage until you configure Supabase.

1. Create a project in Supabase and enable **Anonymous Sign-Ins** under Authentication settings.
2. Run `supabase/migrations/20260814_create_trips.sql` in the Supabase SQL Editor.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to Vercel (Production, Preview, and Development), then redeploy.

Each browser receives a private anonymous identity. Clearing that browser's data creates a new trip, which is expected until account sign-in is added.

