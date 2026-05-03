import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix the well-known Leaflet/Webpack icon bug — bundlers can't resolve
// the default marker images by URL, so we import them and re-register.
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl,
  shadowUrl
})

const NOMINATIM = 'https://nominatim.openstreetmap.org'

/** Forward search — returns array of {display_name, lat, lon, place_id, ...}. */
export async function searchPlaces(query, { limit = 5 } = {}) {
  if (!query || query.trim().length < 2) return []
  const url = `${NOMINATIM}/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Search failed (${res.status})`)
  return res.json()
}

/** Reverse geocoding — lat/lng to address. */
export async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Reverse geocode failed (${res.status})`)
  return res.json()
}

/** Build a coloured circular div-icon for category-coded markers. */
export function categoryIcon(color) {
  return L.divIcon({
    className: 'cat-pin',
    html: `<span style="
      display:block;width:18px;height:18px;border-radius:50%;
      background:${color};border:2.5px solid white;
      box-shadow:0 1px 3px rgba(0,0,0,0.4);
    "></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  })
}

export { L }
