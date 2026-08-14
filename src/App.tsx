import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import { loadTrip, saveTrip, currentTripUrl, subscribeToCurrentTrip, type SavedTrip } from './lib/trip-store'
import { loadCatalog, type CatalogStop } from './lib/catalog-store'

type Kind = 'record' | 'food'
type Rank = 1 | 2 | 3 | 4 | 5
type Stop = CatalogStop & { rank?: Rank; note?: string }

const seedStops: Stop[] = [
  { id: 'mm', name: 'Music Millennium', kind: 'record', neighborhood: 'Laurelhurst', lng: -122.639, lat: 45.522, rating: 4.7, hours: 'Open Â· Closes 7 PM', specialty: 'New releases Â· Local artists', photo: 'ðŸŽ§', description: 'An all-purpose Portland institution with deep new-vinyl bins and an excellent local music wall.', rank: 5, note: 'Check new arrivals + Portland section' },
  { id: 'lr', name: 'Little Axe Records', kind: 'record', neighborhood: 'Northwest', lng: -122.694, lat: 45.532, rating: 4.8, hours: 'Opens 11 AM', specialty: 'Soul Â· Jazz Â· Rare groove', photo: 'ðŸ’¿', description: 'Small, selective shop for adventurous digging: private press, international funk, and heavyweight jazz.', rank: 4 },
  { id: 'ec', name: 'Everyday Music', kind: 'record', neighborhood: 'Hawthorne', lng: -122.623, lat: 45.512, rating: 4.5, hours: 'Open Â· Closes 8 PM', specialty: 'Used vinyl Â· CDs Â· Books', photo: 'ðŸ“€', description: 'A high-volume used-media stop where patient crate digging pays off.' },
  { id: 'mr', name: 'Mississippi Records', kind: 'record', neighborhood: 'Boise', lng: -122.675, lat: 45.551, rating: 4.8, hours: 'Open Â· Closes 7 PM', specialty: 'Folk Â· Blues Â· Global', photo: 'ðŸª•', description: 'Beautifully curated records, reissues, and esoteric gems from around the world.' },
  { id: 'lu', name: 'LÃºc LÃ¡c', kind: 'food', neighborhood: 'Downtown', lng: -122.678, lat: 45.518, rating: 4.6, hours: 'Open Â· Closes 10 PM', specialty: 'Vietnamese Â· Casual', photo: 'ðŸœ', description: 'Fast Vietnamese comfort food; great for an easy midday reset.', meal: 'Lunch', rank: 4 },
  { id: 'jo', name: 'Janken', kind: 'food', neighborhood: 'Pearl District', lng: -122.683, lat: 45.528, rating: 4.5, hours: 'Dinner from 5 PM', specialty: 'Japanese Â· Steakhouse', photo: 'ðŸ£', description: 'A polished dinner option close to Northwest digging.', meal: 'Dinner', rank: 3 }
]

function Recenter({ stop }: { stop: Stop }) {
  const map = useMap()
  map.setView([stop.lat, stop.lng], Math.max(map.getZoom(), 13), { animate: true })
  return null
}

export default function App() {
  const [catalog, setCatalog] = useState<Stop[]>(seedStops)
  const [selected, setSelected] = useState<Stop>(seedStops[0])
  const [added, setAdded] = useState<string[]>(['mm', 'lr', 'lu', 'jo'])
  const [rankings, setRankings] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [persistenceReady, setPersistenceReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const lastSyncedRef = useRef('')
  const stops = catalog
  const [tab, setTab] = useState<'map' | 'plan'>('map')
  const [query, setQuery] = useState('')
  const rankOf = (stop: Stop) => (rankings[stop.id] ?? stop.rank ?? 3) as Rank
  const noteOf = (stop: Stop) => notes[stop.id] ?? stop.note ?? ''
  const [ranking, setRanking] = useState<Rank>(rankOf(selected))
  const [note, setNote] = useState(noteOf(selected))

  const results = useMemo(() => catalog.filter(s => `${s.name} ${s.neighborhood} ${s.specialty}`.toLowerCase().includes(query.toLowerCase())), [query, catalog])
  const itinerary = catalog.filter(s => added.includes(s.id))
  const select = (stop: Stop) => { setSelected(stop); setRanking(rankOf(stop)); setNote(noteOf(stop)) }
  const toggle = () => setAdded(current => current.includes(selected.id) ? current.filter(id => id !== selected.id) : [...current, selected.id])
  const isAdded = added.includes(selected.id)

  const shareTrip = async () => {
    const link = currentTripUrl() ?? window.location.href
    try { await navigator.clipboard.writeText(link) } catch { /* Clipboard may be unavailable; link is still in the URL bar. */ }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  useEffect(() => {
    const fallback: SavedTrip = { added: ['mm', 'lr', 'lu', 'jo'], rankings: {}, notes: {} }
    let unsubscribe = () => {}
    loadTrip(fallback).then(trip => {
      lastSyncedRef.current = JSON.stringify(trip)
      setAdded(trip.added)
      setRankings(trip.rankings)
      setNotes(trip.notes)
      loadCatalog(seedStops).then(setCatalog)
      setPersistenceReady(true)
      // Live updates from the other people viewing this trip link.
      unsubscribe = subscribeToCurrentTrip(next => {
        lastSyncedRef.current = JSON.stringify(next)
        setAdded(next.added)
        setRankings(next.rankings)
        setNotes(next.notes)
      })
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!persistenceReady) return
    const current = JSON.stringify({ added, rankings, notes })
    if (current === lastSyncedRef.current) return // Change came from realtime, not a local edit; skip re-saving it.
    const timer = window.setTimeout(() => {
      lastSyncedRef.current = current
      saveTrip({ added, rankings, notes })
    }, 450)
    return () => window.clearTimeout(timer)
  }, [added, rankings, notes, persistenceReady])

  return <main className="app-shell">
    <section className="map-screen" aria-label="Portland record trip map">
      <MapContainer center={[45.528, -122.665]} zoom={12.1} zoomControl={false} className="leaflet-map" attributionControl>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ZoomControl position="topright" />
        <Recenter stop={selected} />
        {stops.map(stop => <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={L.divIcon({ className: 'trip-marker-wrap', html: `<button class="pin ${added.includes(stop.id) ? stop.kind : 'muted'}" aria-label="View ${stop.name}">${stop.kind === 'food' ? 'âœ¦' : 'â—'}</button>`, iconSize: [31, 31], iconAnchor: [15, 31] })} eventHandlers={{ click: () => select(stop) }} />)}
      </MapContainer>

      <header className="topbar"><div><p className="eyebrow">SEPT 14â€“16 Â· PORTLAND, OR</p><h1>Buy Trips</h1></div><button className="avatar" aria-label="Trip profile">RH</button></header>
      <label className="search"><span>âŒ•</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search records, food, neighborhoods" /></label>
      {query && <div className="search-results">{results.map(stop => <button key={stop.id} onClick={() => { select(stop); setQuery('') }}><span>{stop.photo}</span><span>{stop.name}<small>{stop.specialty}</small></span></button>)}</div>}

      <section className="detail-sheet">
        <div className="handle"></div><div className="detail-head"><div className="shop-photo">{selected.photo}</div><div><span className={`type ${selected.kind}`}>{selected.kind === 'food' ? selected.meal : 'RECORD SHOP'}</span><h2>{selected.name}</h2><p>{selected.neighborhood} Â· <b>â˜… {selected.rating}</b></p></div><button className="close" onClick={() => setSelected(stops[0])} aria-label="Close details">Ã—</button></div>
        <p className="description">{selected.description}</p><div className="facts"><span>â—· {selected.hours}</span><span>âŒ {selected.specialty}</span></div>
        <div className="actions"><button className={`add-button ${isAdded ? 'added' : ''}`} onClick={toggle}>{isAdded ? 'âœ“ In itinerary' : '+ Add to trip'}</button><button className="icon-button" aria-label="Share" onClick={shareTrip}>{copied ? 'âœ“' : 'â†—'}</button></div>
        {isAdded && <div className="personal"><label>Priority <select value={ranking} onChange={e => { const value = Number(e.target.value) as Rank; setRanking(value); setRankings(current => ({ ...current, [selected.id]: value })) }}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{'â—'.repeat(n)}{'â—‹'.repeat(5-n)} Â· {n === 5 ? 'Must visit' : n === 4 ? 'High' : n === 3 ? 'Worth it' : 'Optional'}</option>)}</select></label><label>Note<textarea value={note} onChange={e => { const value = e.target.value; setNote(value); setNotes(current => ({ ...current, [selected.id]: value })) }} placeholder="What are you hunting for?"></textarea></label></div>}
      </section>
    </section>
    <nav className="bottom-nav"><button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>âŒ–<span>Map</span></button><button className={tab === 'plan' ? 'active' : ''} onClick={() => setTab('plan')}>â–¤<span>Itinerary <em>{itinerary.length}</em></span></button></nav>
    {tab === 'plan' && <section className="plan-panel"><div className="plan-head"><div><p className="eyebrow">YOUR PORTLAND RUN</p><h2>{itinerary.length} stops to dig</h2></div><button onClick={() => setTab('map')}>View map</button></div>{(['record', 'food'] as Kind[]).map(kind => <div className="stop-group" key={kind}><h3>{kind === 'record' ? 'Record stores' : 'Fuel stops'}</h3>{itinerary.filter(s => s.kind === kind).map(stop => <button className="stop-row" key={stop.id} onClick={() => { select(stop); setTab('map') }}><span className={`dot ${stop.kind}`}></span><span>{stop.name}<small>{stop.neighborhood} Â· {stop.specialty}</small></span><b>â˜… {rankOf(stop)}</b></button>)}</div>)}</section>}
  </main>
}
