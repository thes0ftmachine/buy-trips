import { createClient } from '@supabase/supabase-js'

export type SavedTrip = {
  added: string[]
  rankings: Record<string, number>
  notes: Record<string, string>
}

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key ? createClient(url, key) : null
let tripId: string | null = null

export async function ensureAnonymousSession() {
  if (!supabase) return false
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) return false
  }
  return true
}

function tripIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('trip')
}

function setTripIdInUrl(id: string) {
  const params = new URLSearchParams(window.location.search)
  params.set('trip', id)
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
}

function localKeyFor(id: string | null) {
  return `buy-trips:portland-v1:${id ?? 'local'}`
}

function localLoad(id: string | null, fallback: SavedTrip) {
  try { return JSON.parse(localStorage.getItem(localKeyFor(id)) ?? '') as SavedTrip } catch { return fallback }
}

export async function loadTrip(fallback: SavedTrip): Promise<SavedTrip> {
  const urlId = tripIdFromUrl()
  if (!supabase || !await ensureAnonymousSession()) return localLoad(urlId, fallback)

  if (urlId) {
    const { data: trip } = await supabase.from('trips').select('id, data').eq('id', urlId).maybeSingle()
    if (trip) { tripId = trip.id; return trip.data as SavedTrip }
  }

  // No trip in the URL, or the linked trip no longer exists: start a new shared trip.
  const { data, error } = await supabase.from('trips').insert({ name: 'Portland record run', data: fallback }).select('id').single()
  if (error) { console.warn('Could not create trip', error.message); return localLoad(urlId, fallback) }
  tripId = data.id
  setTripIdInUrl(data.id)
  return fallback
}

export async function saveTrip(data: SavedTrip) {
  try { localStorage.setItem(localKeyFor(tripId ?? tripIdFromUrl()), JSON.stringify(data)) } catch { /* Storage is optional. */ }
  if (!supabase || !tripId) return
  const { error } = await supabase.from('trips').update({ data }).eq('id', tripId)
  if (error) console.warn('Could not save trip', error.message)
}

export function currentTripUrl(): string | null {
  if (!tripId) return null
  const params = new URLSearchParams(window.location.search)
  params.set('trip', tripId)
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`
}

/**
 * Subscribes to live updates for the currently loaded trip via Supabase Realtime.
 * Must be called after `loadTrip` has resolved (so `tripId` is set).
 * Returns an unsubscribe function; call it on unmount to avoid leaking the channel.
 */
export function subscribeToCurrentTrip(onChange: (data: SavedTrip) => void): () => void {
  if (!supabase || !tripId) return () => {}

  const channel = supabase
    .channel(`trip-${tripId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
      payload => {
        const next = payload.new as { data: SavedTrip }
        if (next?.data) onChange(next.data)
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
