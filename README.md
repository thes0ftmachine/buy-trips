# Buy Trips

A mobile-first Portland record-buying trip planner. It includes seeded record-store and food stops, color-coded itinerary pins, priority rankings, and trip notes.

## Run locally

1. Run `npm install`.
2. Run `npm run dev`.

The app uses Leaflet and OpenStreetMap tiles. No map account or token is required.

## Deploy to Vercel

Import the GitHub repository in Vercel and deploy. Vercel recognizes this Vite project automatically.

## Supabase next step

The UI currently uses sample data in `src/App.tsx`. A Supabase `stops` table should ultimately store a trip ID, place metadata, type (`record` or `food`), selected status, priority, meal, notes, and sort order. Keep Mapbox search as the discovery source; persist only places a user adds to a trip.

