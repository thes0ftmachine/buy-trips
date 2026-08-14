import { ensureAnonymousSession, supabase } from './trip-store'

export type CatalogStop = {
  id: string; name: string; kind: 'record' | 'food'; neighborhood: string; lng: number; lat: number
  rating: number; hours: string; specialty: string; photo: string; description: string; meal?: 'Lunch' | 'Dinner'
  image?: string
}

export async function loadCatalog(fallback: CatalogStop[]): Promise<CatalogStop[]> {
  if (!supabase || !await ensureAnonymousSession()) return fallback
  const { data, error } = await supabase.from('places').select('*').order('name')
  if (error || !data?.length) return fallback
  return data as CatalogStop[]
}
