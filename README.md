# Buy Trips

A mobile-first Portland record-buying trip planner. It includes seeded record-store and food stops, color-coded itinerary pins, priority rankings, and trip notes.

## Run locally

1. Copy `.env.example` to `.env` and add a public Mapbox token from your Mapbox account.
2. Run `npm install`.
3. Run `npm run dev`.

Without `VITE_MAPBOX_TOKEN`, the app intentionally shows a lightweight placeholder map so the trip-planning UI remains usable.

## Deploy to Vercel

Import the GitHub repository in Vercel, add `VITE_MAPBOX_TOKEN` in the Vercel environment variables, and deploy. Vercel recognizes this Vite project automatically.

## Supabase next step

The UI currently uses sample data in `src/App.tsx`. A Supabase `stops` table should ultimately store a trip ID, place metadata, type (`record` or `food`), selected status, priority, meal, notes, and sort order. Keep Mapbox search as the discovery source; persist only places a user adds to a trip.

