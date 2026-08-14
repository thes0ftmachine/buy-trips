import { createClient } from '@supabase/supabase-js'

export type SavedTrip = {
  added: string[]
  rankings: Record<string, number>
  notes: Record<string, string>
}

const localKey = 'buy-trips:portland-v1'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = url && key ? createClient(url, key) : null
let tripId: string | null = null

function localLoad(fallback: SavedTrip) {
  try { return JSON.parse(localStorage.getItem(localKey) ?? '') as SavedTrip } catch { return fallback }
}

export async function loadTrip(fallback: SavedTrip): Promise<SavedTrip> {
  if (!supabase) return localLoad(fallback)
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) await supabase.auth.signInAnonymously()
  const { data: trip } = await supabase.from('trips').select('id, data').order('created_at').limit(1).maybeSingle()
  if (trip) { tripId = trip.id; return trip.data as SavedTrip }
  const { data, error } = await supabase.from('trips').insert({ name: 'Portland record run', data: fallback }).select('id').single()
  if (error) { console.warn('Could not create trip', error.message); return localLoad(fallback) }
  tripId = data.id
  return fallback
}

export async function saveTrip(data: SavedTrip) {
  try { localStorage.setItem(localKey, JSON.stringify(data)) } catch { /* Storage is optional. */ }
  if (!supabase || !tripId) return
  const { error } = await supabase.from('trips').update({ data }).eq('id', tripId)
  if (error) console.warn('Could not save trip', error.message)
}

