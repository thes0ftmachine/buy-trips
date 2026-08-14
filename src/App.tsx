import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import { loadTrip, saveTrip, currentTripUrl, subscribeToCurrentTrip, type SavedTrip } from './lib/trip-store'
import { loadCatalog, type CatalogStop } from './lib/catalog-store'

type Kind = 'record' | 'food'
type Rank = 1 | 2 | 3 | 4 | 5
type Stop = CatalogStop & { rank?: Rank; note?: string }

const seedStops: Stop[] = [
  // — Record stores —
  { id: 'mm', name: 'Music Millennium', kind: 'record', neighborhood: 'Buckman / Kerns', lat: 45.5227167, lng: -122.6319444, rating: 4.7, hours: 'Mon–Sat 10 AM–10 PM · Sun 11 AM–9 PM', specialty: 'New releases · Massive all-format stock', photo: '🎧', description: "Portland's longest-running record shop — vinyl, CDs, and cassettes across two sprawling floors, plus a deep local-artist wall.", rank: 5 },
  { id: 'em', name: 'Everyday Music', kind: 'record', neighborhood: 'Nob Hill / Pearl District', lat: 45.5230092, lng: -122.6848042, rating: 4.5, hours: 'Daily 11 AM–8 PM', specialty: 'Used vinyl · CDs · Film', photo: '📀', description: 'High-volume used-media stop on West Burnside; patient digging turns up serious deals.' },
  { id: 'jr', name: 'Jackpot Records', kind: 'record', neighborhood: 'Hawthorne', lat: 45.511937, lng: -122.6271854, rating: 4.5, hours: 'Mon–Thu 11–6 · Fri–Sat 11–7 · Sun 11–5', specialty: 'New & used · Listening stations', photo: '💿', description: 'A Hawthorne institution with a strong new-release wall and a turntable up front to test before you buy.' },
  { id: 'la', name: 'Little Axe Records', kind: 'record', neighborhood: 'Hollywood District', lat: 45.5356651, lng: -122.62061, rating: 4.9, hours: 'Daily 12–7 PM', specialty: 'Curated genre bins · Deep cassette stock', photo: '🪕', description: 'Small, sharply curated shop on NE Sandy — alphabetized bins and an unusually deep cassette selection.', rank: 4 },
  { id: 'av2', name: '2nd Avenue Records', kind: 'record', neighborhood: 'Downtown', lat: 45.5218858, lng: -122.6726267, rating: 4.7, hours: 'Daily 12–5 PM', specialty: 'Punk · Metal · Vintage tees', photo: '🎸', description: 'Downtown staple known for its punk and metal depth, band tees, and a welcoming vibe for local musicians.' },

  // — Food, each within 2 miles of the store above it —
  { id: 'sde', name: 'Screen Door Eastside', kind: 'food', neighborhood: 'Kerns', lat: 45.523017, lng: -122.641625, rating: 4.7, hours: 'Daily 8:30 AM–2 PM · 4:30–9:30 PM', specialty: 'Southern comfort · Fried chicken', photo: '🍗', meal: 'Brunch', description: '0.5 mi from Music Millennium — Southern brunch and fried chicken in a lively room.' },
  { id: 'aoa', name: 'Ate-Oh-Ate', kind: 'food', neighborhood: 'Kerns', lat: 45.522656, lng: -122.640256, rating: 4.5, hours: 'Daily 11 AM–9 PM', specialty: 'Hawaiian plate lunch', photo: '🍱', meal: 'Lunch', description: 'Plate-lunch Hawaiian food a few blocks from Music Millennium.' },
  { id: 'hv', name: 'Hearth & Vine', kind: 'food', neighborhood: 'Pearl District', lat: 45.523303, lng: -122.6829435, rating: 4.6, hours: 'Tue–Sun 11 AM–10 PM', specialty: 'Wine bar · New American', photo: '🍷', meal: 'Dinner', description: 'Steps from Everyday Music — wine-forward New American with a terrace.' },
  { id: 'llk', name: 'Luc Lac Vietnamese Kitchen', kind: 'food', neighborhood: 'Downtown', lat: 45.5168971, lng: -122.6754165, rating: 4.4, hours: 'Daily 11 AM–2:30 PM · 4–11 PM', specialty: 'Vietnamese · Late-night', photo: '🍜', meal: 'Lunch', description: 'Fast Vietnamese comfort food downtown — in range of Everyday Music and 2nd Avenue Records.', rank: 4 },
  { id: 'dns', name: 'Ding & Spice', kind: 'food', neighborhood: 'Hawthorne', lat: 45.5118576, lng: -122.6285016, rating: 4.6, hours: 'Daily 11 AM–9/10 PM', specialty: 'Szechuan · Hand-pulled noodles', photo: '🌶️', meal: 'Dinner', description: 'A block from Jackpot Records — modern Szechuan with mala and dan dan noodles.' },
  { id: 'nh', name: 'Naan Hero', kind: 'food', neighborhood: 'Hawthorne', lat: 45.5122375, lng: -122.6324815, rating: 4.8, hours: 'Wed–Sun 11 AM–6 PM', specialty: 'NYC-style naan sandwiches', photo: '🥙', meal: 'Lunch', description: 'A cart near Jackpot Records turning naan into NYC bodega-style sandwiches.' },
  { id: 'shu', name: 'Shucos PDX', kind: 'food', neighborhood: 'Hollywood District', lat: 45.5355634, lng: -122.6217559, rating: 4.8, hours: 'Daily 12–9:30 PM', specialty: 'Guatemalan hot dogs · Churrasco', photo: '🌭', meal: 'Dinner', description: 'House-made Guatemalan sausages right by Little Axe Records.' },
  { id: 'cmk', name: 'Cappadocia Mediterranean Kitchen', kind: 'food', neighborhood: 'Hollywood District', lat: 45.535771, lng: -122.6217388, rating: 4.9, hours: 'Mon 9–5 · Tue–Sun 11–9', specialty: 'Turkish · Pide · Kebab', photo: '🥙', meal: 'Dinner', description: 'Handmade pide and kebab a few doors from Little Axe Records.' },
  { id: 'psm', name: 'Pine Street Market', kind: 'food', neighborhood: 'Downtown', lat: 45.5213258, lng: -122.6723426, rating: 4.6, hours: 'Daily 11 AM–9 PM', specialty: 'Food hall · Multiple vendors', photo: '🥟', meal: 'Lunch', description: 'Historic food hall a block from 2nd Avenue Records — good for splitting a group.' },
  { id: 'xdd', name: 'Xin Ding Dumpling House', kind: 'food', neighborhood: 'Downtown', lat: 45.5222443, lng: -122.6724998, rating: 4.6, hours: 'Mon–Thu 11–2:30, 4–9 · Fri–Sat 11–1 AM · Sun 11–9', specialty: 'Dumplings · Sichuan', photo: '🥟', meal: 'Dinner', description: 'Dumplings and Sichuan classics next door to 2nd Avenue Records.' },
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
  const remove = (id: string) => setAdded(current => current.filter(existingId => existingId !== id))
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
        {stops.map(stop => <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={L.divIcon({ className: 'trip-marker-wrap', html: `<button class="pin ${added.includes(stop.id) ? stop.kind : 'muted'}" aria-label="View ${stop.name}">${stop.kind === 'food' ? '✦' : '●'}</button>`, iconSize: [31, 31], iconAnchor: [15, 31] })} eventHandlers={{ click: () => select(stop) }} />)}
      </MapContainer>

      <header className="topbar"><div><p className="eyebrow">SEPT 05 · PORTLAND, OR</p><h1>RECORD HUNTERS</h1></div><button className="avatar" aria-label="Trip profile">RH</button></header>
      <label className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search records, food, neighborhoods" /></label>
      {query && <div className="search-results">{results.map(stop => <button key={stop.id} onClick={() => { select(stop); setQuery('') }}><span>{stop.photo}</span><span>{stop.name}<small>{stop.specialty}</small></span></button>)}</div>}

      <section className="detail-sheet">
        <div className="handle"></div><div className="detail-head"><div className="shop-photo">{selected.photo}</div><div><span className={`type ${selected.kind}`}>{selected.kind === 'food' ? selected.meal : 'RECORD SHOP'}</span><h2>{selected.name}</h2><p>{selected.neighborhood} · <b>★ {selected.rating}</b></p></div><button className="close" onClick={() => setSelected(stops[0])} aria-label="Close details">×</button></div>
        <p className="description">{selected.description}</p><div className="facts"><span>◷ {selected.hours}</span><span>🏷️ {selected.specialty}</span></div>
        <div className="actions"><button className={`add-button ${isAdded ? 'added' : ''}`} onClick={toggle}>{isAdded ? '✓ In itinerary' : '+ Add to trip'}</button><button className="icon-button" aria-label="Share" onClick={shareTrip}>{copied ? '✓' : '↗'}</button></div>
        {isAdded && <div className="personal"><label>Priority <select value={ranking} onChange={e => { const value = Number(e.target.value) as Rank; setRanking(value); setRankings(current => ({ ...current, [selected.id]: value })) }}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{'●'.repeat(n)}{'○'.repeat(5-n)} · {n === 5 ? 'Must visit' : n === 4 ? 'High' : n === 3 ? 'Worth it' : 'Optional'}</option>)}</select></label><label>Note<textarea value={note} onChange={e => { const value = e.target.value; setNote(value); setNotes(current => ({ ...current, [selected.id]: value })) }} placeholder="What are you hunting for?"></textarea></label></div>}
      </section>
    </section>
    <nav className="bottom-nav"><button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>⌖<span>Map</span></button><button className={tab === 'plan' ? 'active' : ''} onClick={() => setTab('plan')}>▤<span>Itinerary <em>{itinerary.length}</em></span></button></nav>
    {tab === 'plan' && <section className="plan-panel"><div className="plan-head"><div><p className="eyebrow">YOUR PORTLAND RUN</p><h2>{itinerary.length} stops to dig</h2></div><button onClick={() => setTab('map')}>View map</button></div>{(['record', 'food'] as Kind[]).map(kind => <div className="stop-group" key={kind}><h3>{kind === 'record' ? 'Record stores' : 'Fuel stops'}</h3>{itinerary.filter(s => s.kind === kind).map(stop => <div className="stop-row" key={stop.id}><button className="stop-row-main" onClick={() => { select(stop); setTab('map') }}><span className={`dot ${stop.kind}`}></span><span>{stop.name}<small>{stop.neighborhood} · {stop.specialty}</small></span><b>★ {rankOf(stop)}</b></button><button className="remove-stop" aria-label={`Remove ${stop.name} from itinerary`} onClick={() => remove(stop.id)}>×</button></div>)}</div>)}</section>}
  </main>
}
