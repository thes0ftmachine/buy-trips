import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import { loadTrip, saveTrip, currentTripUrl, subscribeToCurrentTrip, type SavedTrip } from './lib/trip-store'
import { loadCatalog, type CatalogStop } from './lib/catalog-store'

type Rank = 1 | 2 | 3 | 4 | 5
type Stop = CatalogStop & { rank?: Rank; note?: string }

// Every entry verified against Google Places (name, address, coordinates, hours, rating) so this is
// a real, comprehensive list of Portland-metro record stores -- not just a curated sample. Covers
// Portland proper (Kerns, Pearl, Hawthorne, Hollywood, Boise, Buckman, Sellwood, St. Johns,
// Montavilla, Foster-Powell, Division-Clinton) plus close-in metro (Milwaukie, Oak Grove, Beaverton,
// Vancouver WA). `image` is left blank -- see README "Shop photos".
const seedStops: Stop[] = [
  { id: 'mm', name: 'Music Millennium', kind: 'record', neighborhood: 'Kerns', lng: -122.6319444, lat: 45.5227167, rating: 4.7, hours: 'Open daily · Closes 9–10 PM', specialty: 'New releases · Local artists', photo: '🎧', description: 'An all-purpose Portland institution with deep new-vinyl bins and an excellent local music wall.', rank: 5, note: 'Check new arrivals + Portland section' },
  { id: 'lr', name: 'Little Axe Records', kind: 'record', neighborhood: 'Hollywood District', lng: -122.62061, lat: 45.5356651, rating: 4.9, hours: 'Open daily · Closes 7 PM', specialty: 'Soul · Jazz · Rare groove', photo: '💿', description: 'Small, selective shop for adventurous digging: private press, international funk, and heavyweight jazz.', rank: 4 },
  { id: 'ec', name: 'Everyday Music', kind: 'record', neighborhood: 'Pearl District', lng: -122.6848042, lat: 45.5230092, rating: 4.5, hours: 'Open daily · Closes 8 PM', specialty: 'Used vinyl · CDs · Books', photo: '📀', description: 'A high-volume used-media stop where patient crate digging pays off.' },
  { id: 'mr', name: 'Mississippi Records', kind: 'record', neighborhood: 'Boise', lng: -122.6747752, lat: 45.5605325, rating: 4.8, hours: 'Open daily · Closes 7 PM', specialty: 'Folk · Blues · Global', photo: '🪕', description: 'Beautifully curated records, reissues, and esoteric gems from around the world.' },
  { id: 'av', name: '2nd Avenue Records', kind: 'record', neighborhood: 'Downtown', lng: -122.6726267, lat: 45.5218858, rating: 4.7, hours: 'Open daily · Closes 5 PM', specialty: 'Punk · Metal · Used vinyl', photo: '🎸', description: 'A downtown staple with deep punk, metal, and used-vinyl bins, run by people who clearly love the format.' },
  { id: 'jp', name: 'Jackpot Records', kind: 'record', neighborhood: 'Hawthorne', lng: -122.6271854, lat: 45.511937, rating: 4.5, hours: 'Open daily · Closes 5–7 PM', specialty: 'New releases · Reissues', photo: '🎻', description: 'A Hawthorne favorite for new releases and reissues, with a listening station to test records before you buy.' },
  { id: 'sc', name: 'Second Chance Records', kind: 'record', neighborhood: 'Montavilla', lng: -122.6043195, lat: 45.5227151, rating: 5.0, hours: 'Thu–Sun · Closes 8 PM', specialty: 'Used vinyl · All genres', photo: '📻', description: 'A cozy, welcoming shop with a wide-ranging genre mix, records cleaned and resleeved before they hit the racks.' },
  { id: 'vu', name: 'My Vinyl Underground', kind: 'record', neighborhood: 'Division-Clinton', lng: -122.6516711, lat: 45.5049835, rating: 4.9, hours: 'Fri–Sun · Closes 6 PM', specialty: 'Basement digs · Rarities', photo: '🎷', description: 'A basement hideaway off Division with fairly priced rarities and handwritten notes on the harder-to-find stuff.' },
  { id: 'tm', name: 'Too Many Records', kind: 'record', neighborhood: 'St. Johns', lng: -122.6857368, lat: 45.5768356, rating: 4.9, hours: 'Tue–Sun · Closes 8 PM', specialty: 'Curated used vinyl', photo: '🎺', description: 'A consciously curated used-vinyl shop in St. Johns with a constantly rotating, well-graded selection.' },
  { id: 'vr', name: 'Vinyl Resting Place', kind: 'record', neighborhood: 'St. Johns', lng: -122.7527576, lat: 45.5893692, rating: 4.7, hours: 'Thu–Sun · Closes 5 PM', specialty: 'New & used · $1 bins', photo: '🎹', description: 'A St. Johns gem with deep new-and-used stock and bargain $1 bins worth digging through.' },
  { id: 'cm', name: 'Crossroads Music', kind: 'record', neighborhood: 'Foster-Powell', lng: -122.5797858, lat: 45.4828406, rating: 4.7, hours: 'Open daily · Closes 6–7 PM', specialty: 'Vinyl · CDs · Cassettes', photo: '🎶', description: 'A big, eclectic media stop in outer Southeast with vinyl, CDs, and one of the better cassette selections in town.' },
  { id: 'lf', name: 'Landfill Rescue Unit Records', kind: 'record', neighborhood: 'Buckman', lng: -122.6393733, lat: 45.5166465, rating: 4.7, hours: 'Open daily · Closes 7 PM', specialty: 'Punk · Metal · Esoteric', photo: '🤘', description: 'A Buckman favorite for punk, metal, and harder-to-find records, with labeled genres and a listening station.' },
  { id: 'rp', name: 'The Record Pub', kind: 'record', neighborhood: 'Sellwood', lng: -122.6491491, lat: 45.4787278, rating: 4.9, hours: 'Open daily · Closes 7–10 PM', specialty: 'Rock vinyl · Record bar', photo: '🍺', description: "Part record shop, part bar -- browse rock vinyl in Sellwood's Iron Horse building with a pint in hand." },
  { id: 'dv', name: 'Dig Vinyl', kind: 'record', neighborhood: 'Sellwood-Westmoreland', lng: -122.6531767, lat: 45.4630689, rating: 4.9, hours: 'Open daily · Closes 7 PM', specialty: 'Jazz · Rock · Hole-in-the-wall', photo: '🕵️', description: 'A tiny Sellwood hole-in-the-wall with a well-priced, well-graded selection especially strong in jazz and rock.' },
  { id: 'va', name: 'Variety Records', kind: 'record', neighborhood: 'Foster-Powell', lng: -122.6116982, lat: 45.4971926, rating: 4.7, hours: 'Open daily · Closes 5 PM', specialty: 'Vinyl · CDs · DVDs', photo: '📼', description: 'A Foster Road media shop stacked with vinyl, CDs, DVDs, and cassettes at low prices.' },
  { id: 'ex', name: 'Exiled Records', kind: 'record', neighborhood: 'Beaverton', lng: -122.7666471, lat: 45.498266, rating: 4.7, hours: 'Open daily · Closes 6–8 PM', specialty: 'Pop · Rock · Hip-hop', photo: '🔊', description: 'A big Beaverton-area shop with deep pop, rock, and hip-hop bins plus a solid clearance section.' },
  { id: 'cn', name: 'City Noise Records', kind: 'record', neighborhood: 'Montavilla', lng: -122.5906726, lat: 45.5267087, rating: 4.9, hours: 'Wed–Sun · Closes 6 PM', specialty: 'Punk · Hardcore · DIY', photo: '🎙️', description: 'An old-school punk and hardcore shop attached to a cafe in Montavilla, with a tight, hand-picked selection.' },
  { id: 'bs', name: 'B-Side Records & Vintage', kind: 'record', neighborhood: 'Milwaukie', lng: -122.6417095, lat: 45.4446209, rating: 4.8, hours: 'Open daily · Closes 5–9 PM', specialty: 'Vinyl · Antiques · Live music', photo: '🕰️', description: 'A downtown Milwaukie record-and-antiques shop with a small bar and regular live performances.' },
  { id: 'dr', name: 'Daily Records', kind: 'record', neighborhood: 'Oak Grove', lng: -122.6235654, lat: 45.4071832, rating: 4.9, hours: 'Tue–Sun · Closes 5–6 PM', specialty: 'New & used · Turntable gear', photo: '🎵', description: 'A low-key Oak Grove shop with new and used vinyl plus turntable gear and cleaning supplies.' },
  { id: 'r503', name: '503 Records', kind: 'record', neighborhood: 'Beaverton', lng: -122.8066143, lat: 45.4920266, rating: 4.9, hours: 'Wed–Sun · Closes 5–8 PM', specialty: 'Hip-hop · All genres', photo: '🎤', description: 'A small Beaverton shop known for its hip-hop selection and a genuinely welcoming owner.' },
  { id: 'bw', name: 'Black Water Records', kind: 'record', neighborhood: 'Hollywood District', lng: -122.6105869, lat: 45.5401251, rating: 4.7, hours: 'Open daily · Closes 7 PM', specialty: 'Punk · Goth · Industrial', photo: '🖤', description: 'An all-volunteer, punk-community shop on NE Sandy with deep goth, industrial, and hardcore stock.' },
  { id: 'r1709', name: '1709 Records', kind: 'record', neighborhood: 'Vancouver, WA', lng: -122.670238, lat: 45.634447, rating: 4.8, hours: 'Wed–Sun · Closes 5 PM', specialty: 'New & used · Metal · Punk', photo: '🐕', description: 'A cozy, dog-friendly Vancouver, WA shop with a strong punk and metal selection.' },
  { id: 'eb', name: "Everybody's Music", kind: 'record', neighborhood: 'Vancouver, WA', lng: -122.6676545, lat: 45.6350898, rating: 4.7, hours: 'Wed–Sun · Closes 6–7 PM', specialty: 'Used vinyl · DVDs · Blu-ray', photo: '🎞️', description: 'A well-organized Vancouver, WA shop with deep used vinyl, CDs, and a well-loved dollar section.' },
  { id: 'rr', name: 'Ronald Records', kind: 'record', neighborhood: 'Vancouver, WA', lng: -122.6714488, lat: 45.6290568, rating: 4.8, hours: 'Open daily · Closes 6 PM', specialty: 'Community hub · All genres', photo: '🎉', description: 'A Vancouver, WA record shop that doubles as a community hub, with regular listening parties.' }
]

function Recenter({ stop }: { stop: Stop }) {
  const map = useMap()
  // Runs only when the selected stop actually changes (a click), not on every re-render --
  // otherwise typing in search or saving a note would silently snap the map back.
  useEffect(() => {
    map.setView([stop.lat, stop.lng], Math.max(map.getZoom(), 13), { animate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop.id])
  return null
}

export default function App() {
  const [catalog, setCatalog] = useState<Stop[]>(seedStops)
  const [selected, setSelected] = useState<Stop>(seedStops[0])
  const [sheetOpen, setSheetOpen] = useState(true)
  const [added, setAdded] = useState<string[]>(['mm', 'lr', 'mr', 'jp'])
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
  const select = (stop: Stop) => { setSelected(stop); setRanking(rankOf(stop)); setNote(noteOf(stop)); setSheetOpen(true) }
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
    const fallback: SavedTrip = { added: ['mm', 'lr', 'mr', 'jp'], rankings: {}, notes: {} }
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
      <MapContainer center={[45.55, -122.68]} zoom={11} zoomControl={false} className="leaflet-map" attributionControl>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ZoomControl position="topright" />
        <Recenter stop={selected} />
        {stops.map(stop => <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={L.divIcon({ className: 'trip-marker-wrap', html: `<button class="pin ${added.includes(stop.id) ? 'record' : 'muted'}" aria-label="View ${stop.name}">●</button>`, iconSize: [31, 31], iconAnchor: [15, 31] })} eventHandlers={{ click: () => select(stop) }} />)}
      </MapContainer>

      <header className="topbar"><div><p className="eyebrow">SEPT 14–16 · PORTLAND, OR</p><h1>Buy Trips</h1></div><button className="avatar" aria-label="Trip profile">RH</button></header>
      <label className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search records, neighborhoods, specialties" /></label>
      {query && <div className="search-results">{results.map(stop => <button key={stop.id} onClick={() => { select(stop); setQuery('') }}><span>{stop.photo}</span><span>{stop.name}<small>{stop.specialty}</small></span></button>)}</div>}

      {sheetOpen && <section className="detail-sheet">
        <div className="handle"></div><div className="detail-head"><div className="shop-photo">{selected.image ? <img src={selected.image} alt={selected.name} /> : selected.photo}</div><div><span className="type record">RECORD SHOP</span><h2>{selected.name}</h2><p>{selected.neighborhood} · <b>★ {selected.rating}</b></p></div><button className="close" onClick={() => setSheetOpen(false)} aria-label="Close details">×</button></div>
        <p className="description">{selected.description}</p><div className="facts"><span>◷ {selected.hours}</span><span>🏷️ {selected.specialty}</span></div>
        <div className="actions"><button className={`add-button ${isAdded ? 'added' : ''}`} onClick={toggle}>{isAdded ? '✓ In itinerary' : '+ Add to trip'}</button><button className="icon-button" aria-label="Share" onClick={shareTrip}>{copied ? '✓' : '↗'}</button></div>
        {isAdded && <div className="personal"><label>Priority <select value={ranking} onChange={e => { const value = Number(e.target.value) as Rank; setRanking(value); setRankings(current => ({ ...current, [selected.id]: value })) }}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{'●'.repeat(n)}{'○'.repeat(5-n)} · {n === 5 ? 'Must visit' : n === 4 ? 'High' : n === 3 ? 'Worth it' : 'Optional'}</option>)}</select></label><label>Note<textarea value={note} onChange={e => { const value = e.target.value; setNote(value); setNotes(current => ({ ...current, [selected.id]: value })) }} placeholder="What are you hunting for?"></textarea></label></div>}
      </section>}
    </section>
    <nav className="bottom-nav"><button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>⌖<span>Map</span></button><button className={tab === 'plan' ? 'active' : ''} onClick={() => setTab('plan')}>▤<span>Itinerary <em>{itinerary.length}</em></span></button></nav>
    {tab === 'plan' && <section className="plan-panel"><div className="plan-head"><div><p className="eyebrow">YOUR PORTLAND RUN</p><h2>{itinerary.length} stops to dig</h2></div><button onClick={() => setTab('map')}>View map</button></div><div className="stop-group"><h3>Record stores</h3>{itinerary.map(stop => <div className="stop-row" key={stop.id}><button className="stop-row-main" onClick={() => { select(stop); setTab('map') }}><span className="dot record"></span><span>{stop.name}<small>{stop.neighborhood} · {stop.specialty}</small></span><b>★ {rankOf(stop)}</b></button><button className="remove-stop" aria-label={`Remove ${stop.name} from itinerary`} onClick={() => remove(stop.id)}>×</button></div>)}</div></section>}
  </main>
}
