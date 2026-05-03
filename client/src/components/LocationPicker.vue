<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { L, searchPlaces, reverseGeocode } from '../composables/useLeaflet'

const props = defineProps({
  modelValue: { type: Object, default: () => null }
})
const emit = defineEmits(['update:modelValue'])

const searchInput = ref('')
const suggestions = ref([])
const showSuggestions = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const mapEl = ref(null)

let map = null
let marker = null
let searchDebounce = null
let blurTimer = null

function emitLocation(loc) { emit('update:modelValue', loc) }

async function initMap() {
  // Multiple frames + delay to ensure modal animation is settled
  await nextTick()
  await new Promise((r) => requestAnimationFrame(r))
  await new Promise((r) => setTimeout(r, 80))
  if (!mapEl.value || map) return

  const center = props.modelValue?.lat
    ? [props.modelValue.lat, props.modelValue.lng]
    : [51.4545, -2.5879] // Bristol — UWE
  map = L.map(mapEl.value, { zoomControl: true })
    .setView(center, props.modelValue?.lat ? 15 : 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map)

  if (props.modelValue?.lat) placeMarker([props.modelValue.lat, props.modelValue.lng])

  map.on('click', async (e) => {
    const { lat, lng } = e.latlng
    placeMarker([lat, lng])
    await onPickedPoint(lat, lng)
  })

  // Force re-measure after map is in the DOM
  map.invalidateSize()
  setTimeout(() => map?.invalidateSize(), 200)
  setTimeout(() => map?.invalidateSize(), 600)
}

function placeMarker(latlng) {
  if (!map) return
  if (marker) marker.remove()
  marker = L.marker(latlng, { draggable: true }).addTo(map)
  marker.on('dragend', async () => {
    const p = marker.getLatLng()
    await onPickedPoint(p.lat, p.lng)
  })
}

async function onPickedPoint(lat, lng) {
  loading.value = true
  errorMsg.value = ''
  try {
    const r = await reverseGeocode(lat, lng)
    const display = r?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    searchInput.value = display
    emitLocation({
      name: r?.name || '',
      address: display,
      lat,
      lng,
      placeId: r?.place_id ? String(r.place_id) : ''
    })
  } catch (err) {
    errorMsg.value = err.message
    emitLocation({ name: '', address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng, placeId: '' })
  } finally {
    loading.value = false
  }
}

function onSearchInput() {
  showSuggestions.value = true
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(async () => {
    const q = searchInput.value.trim()
    if (q.length < 2) { suggestions.value = []; return }
    try {
      suggestions.value = await searchPlaces(q, { limit: 6 })
    } catch (err) {
      errorMsg.value = err.message
    }
  }, 350)
}

function onInputFocus() {
  if (suggestions.value.length) showSuggestions.value = true
}

function onInputBlur() {
  // Delay so that mousedown on a suggestion can fire first
  clearTimeout(blurTimer)
  blurTimer = setTimeout(() => { showSuggestions.value = false }, 200)
}

function pickSuggestion(s) {
  const lat = Number(s.lat)
  const lng = Number(s.lon)
  showSuggestions.value = false
  searchInput.value = s.display_name
  if (map) {
    map.setView([lat, lng], 16)
    placeMarker([lat, lng])
  }
  emitLocation({
    name: s.name || '',
    address: s.display_name,
    lat,
    lng,
    placeId: s.place_id ? String(s.place_id) : ''
  })
}

function useCurrentLocation() {
  if (!navigator.geolocation) { errorMsg.value = 'Geolocation not supported'; return }
  loading.value = true
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      if (map) {
        map.setView([lat, lng], 16)
        placeMarker([lat, lng])
      }
      await onPickedPoint(lat, lng)
      loading.value = false
    },
    (err) => { errorMsg.value = err.message; loading.value = false },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

function clear() {
  emitLocation(null)
  searchInput.value = ''
  suggestions.value = []
  if (marker) { marker.remove(); marker = null }
}

watch(
  () => props.modelValue,
  (val) => {
    if (!val && marker) { marker.remove(); marker = null }
    if (val && !searchInput.value) searchInput.value = val.address || val.name || ''
  }
)

onMounted(initMap)
onBeforeUnmount(() => {
  clearTimeout(searchDebounce)
  clearTimeout(blurTimer)
  if (map) { map.remove(); map = null }
})
</script>

<template>
  <div class="loc">
    <div class="loc-head">
      <span class="title">Location <span class="opt">(click on map or search)</span></span>
      <button v-if="modelValue" type="button" class="link" @click="clear">Clear</button>
    </div>

    <div class="row">
      <div class="search-wrap">
        <input
          v-model="searchInput"
          type="text"
          placeholder="Search a place…"
          @focus="onInputFocus"
          @input="onSearchInput"
          @blur="onInputBlur"
          autocomplete="off"
        />
        <ul v-if="showSuggestions && suggestions.length" class="suggestions">
          <li v-for="s in suggestions" :key="s.place_id" @mousedown.prevent="pickSuggestion(s)">
            <span class="s-main">{{ s.name || s.display_name.split(',')[0] }}</span>
            <span class="s-sub">{{ s.display_name }}</span>
          </li>
        </ul>
      </div>
      <button type="button" class="gps" :disabled="loading" @click="useCurrentLocation" title="Use my current location">
        ⌖
      </button>
    </div>

    <div v-if="errorMsg" class="err">{{ errorMsg }}</div>

    <div ref="mapEl" class="map"></div>

    <div v-if="modelValue" class="picked">
      <span class="dot"></span>
      <span class="addr">{{ modelValue.name || modelValue.address || `${modelValue.lat?.toFixed(4)}, ${modelValue.lng?.toFixed(4)}` }}</span>
    </div>
    <p v-else class="hint">Tip: Click anywhere on the map to drop a pin, or drag the marker to fine-tune.</p>
  </div>
</template>

<style scoped>
.loc { display: flex; flex-direction: column; gap: 0.4rem; }
.loc-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-weight: 500;
}
.opt { color: var(--color-text-faded); font-weight: 400; font-size: 0.78rem; }
.link {
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}

.row { display: flex; gap: 0.4rem; }
.search-wrap { flex: 1; position: relative; }
.search-wrap input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  box-sizing: border-box;
}
.search-wrap input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(0,187,119,0.15);
}
.suggestions {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  list-style: none;
  margin: 0;
  padding: 0.25rem 0;
  box-shadow: var(--shadow-md);
  z-index: 1100;
  max-height: 240px;
  overflow-y: auto;
}
.suggestions li {
  padding: 0.5rem 0.85rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  border-bottom: 1px solid var(--color-border-light);
}
.suggestions li:last-child { border-bottom: none; }
.suggestions li:hover { background: var(--color-info-bg); }
.s-main { font-size: 0.88rem; color: var(--color-text); font-weight: 600; }
.s-sub {
  font-size: 0.74rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gps {
  width: 38px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-accent);
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 700;
  font-family: inherit;
  flex-shrink: 0;
}
.gps:hover:not(:disabled) { background: var(--color-info-bg); }
.gps:disabled { opacity: 0.5; cursor: not-allowed; }

.map {
  height: 260px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  margin-top: 0.4rem;
  overflow: hidden;
  background: var(--color-bg);
  z-index: 1;
}
.picked {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: var(--color-text);
  background: var(--color-info-bg);
  padding: 0.45rem 0.7rem;
  border-radius: 6px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  flex-shrink: 0;
}
.addr {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hint {
  margin: 0.1rem 0 0;
  font-size: 0.75rem;
  color: var(--color-text-faded);
}
.err {
  font-size: 0.8rem;
  color: var(--color-error-text);
}
</style>
