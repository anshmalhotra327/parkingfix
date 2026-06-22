import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { api } from '../utils/api'
import { PageHeader, Card, LoadingBox, ScoreBar } from '../components/UI'

const BENGALURU = [12.9716, 77.5946]

const METRO_STATIONS = [
  { name: 'Majestic',       lat: 12.9767, lng: 77.5713 },
  { name: 'MG Road',        lat: 12.9756, lng: 77.6099 },
  { name: 'Indiranagar',    lat: 12.9784, lng: 77.6408 },
  { name: 'Rajajinagar',    lat: 12.9919, lng: 77.5511 },
  { name: 'Hosahalli',      lat: 12.9776, lng: 77.5188 },
  { name: 'Nagasandra',     lat: 13.0484, lng: 77.5133 },
  { name: 'Byappanahalli',  lat: 12.9926, lng: 77.6478 },
  { name: 'Vijayanagar',    lat: 12.9673, lng: 77.5310 },
  { name: 'Yelachenahalli', lat: 12.8934, lng: 77.5877 },
]

const MAP_TILES = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr: '&copy; <a href="https://carto.com">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>',
  },
  street: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attr: '&copy; <a href="https://carto.com">CARTO</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: '&copy; Esri',
  },
}

// Load Leaflet + leaflet.heat from CDN once, then call cb
function loadLeaflet(cb) {
  if (window.L && window.L.heatLayer) { cb(); return }

  const addCSS = href => {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const l = document.createElement('link')
      l.rel = 'stylesheet'; l.href = href
      document.head.appendChild(l)
    }
  }
  const addScript = (src, next) => {
    if (document.querySelector(`script[src="${src}"]`)) { next(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = next; document.head.appendChild(s)
  }

  addCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css')
  addScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', () => {
    // Fix Leaflet icon paths broken by Vite
    delete window.L.Icon.Default.prototype._getIconUrl
    window.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
    addScript('https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js', cb)
  })
}

export default function Heatmap() {
  const mapDivRef    = useRef(null)
  const mapRef       = useRef(null)   // L.map instance
  const tileRef      = useRef(null)   // current tile layer
  const heatRef      = useRef(null)   // L.heatLayer
  const metroRef     = useRef([])     // metro circle markers
  const [ready, setReady] = useState(false)
  const [minCount, setMinCount]   = useState(5)
  const [mapStyle, setMapStyle]   = useState('dark')

  const { data, isLoading } = useQuery({
    queryKey: ['heatmap', minCount],
    queryFn: () => api.get(`/analytics/heatmap?min_count=${minCount}`).then(r => r.data),
  })

  const { data: jData } = useQuery({
    queryKey: ['junctions-hm'],
    queryFn: () => api.get('/impact/junctions?top_n=8').then(r => r.data),
  })

  // ── Step 1: load Leaflet scripts, then init map ───────────────────────
  useEffect(() => {
    loadLeaflet(() => {
      if (mapRef.current || !mapDivRef.current) return
      const L = window.L
      const map = L.map(mapDivRef.current, {
        center: BENGALURU, zoom: 12, zoomControl: true,
      })

      // default dark tile
      tileRef.current = L.tileLayer(MAP_TILES.dark.url, {
        attribution: MAP_TILES.dark.attr, maxZoom: 19,
      }).addTo(map)

      // metro circles
      METRO_STATIONS.forEach(m => {
        const c = L.circleMarker([m.lat, m.lng], {
          radius: 7, fillColor: '#14b8a6', fillOpacity: 0.5,
          color: '#14b8a6', weight: 2, opacity: 0.9,
        }).addTo(map)
        c.bindTooltip(`🚇 ${m.name}`, {
          permanent: false, direction: 'top', className: 'piq-metro-tip',
        })
        metroRef.current.push(c)
      })

      mapRef.current = map
      setReady(true)
    })
    return () => {
      // cleanup on unmount
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  // ── Step 2: update heatmap layer when data arrives ────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current || !data?.points) return
    const L = window.L
    if (heatRef.current) mapRef.current.removeLayer(heatRef.current)

    const maxC = data.max_count || 1
    const pts  = data.points.map(p => [p.lat, p.lng, p.count / maxC])

    heatRef.current = L.heatLayer(pts, {
      radius: 28, blur: 22, maxZoom: 15, max: 1.0,
      gradient: {
        0.00: '#0ea5e9',
        0.25: '#6366f1',
        0.45: '#f59e0b',
        0.65: '#ef4444',
        0.85: '#ff2200',
        1.00: '#ffffff',
      },
    }).addTo(mapRef.current)
  }, [data, ready])

  // ── Step 3: swap tile layer on style change ───────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return
    const L = window.L
    if (tileRef.current) mapRef.current.removeLayer(tileRef.current)
    const t = MAP_TILES[mapStyle]
    tileRef.current = L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 })
    tileRef.current.addTo(mapRef.current)
    tileRef.current.setZIndex(0)
    if (heatRef.current) heatRef.current.setZIndex && heatRef.current.setZIndex(1)
  }, [mapStyle, ready])

  return (
    <div>
      <PageHeader
        title="Violation Heatmap"
        subtitle="Live map of parking violation density across Bengaluru — zoom and pan freely"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Min:</span>
            {[3, 5, 10, 20].map(n => (
              <button key={n} onClick={() => setMinCount(n)} style={{
                padding: '4px 10px', borderRadius: 5, fontSize: 11,
                cursor: 'pointer', border: 'none',
                background: minCount === n ? 'var(--accent)' : 'var(--bg3)',
                color: minCount === n ? '#fff' : 'var(--muted)',
              }}>{n}+</button>
            ))}
            <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />
            {['dark', 'street', 'satellite'].map(s => (
              <button key={s} onClick={() => setMapStyle(s)} style={{
                padding: '4px 10px', borderRadius: 5, fontSize: 11,
                cursor: 'pointer', border: 'none', textTransform: 'capitalize',
                background: mapStyle === s ? '#6366f1' : 'var(--bg3)',
                color: mapStyle === s ? '#fff' : 'var(--muted)',
              }}>{s}</button>
            ))}
          </div>
        }
      />

      {/* Leaflet CSS overrides */}
      <style>{`
        .piq-metro-tip {
          background: rgba(13,21,32,0.92) !important;
          border: 1px solid rgba(20,184,166,0.45) !important;
          color: #e8eaf0 !important;
          font-size: 12px !important;
          border-radius: 6px !important;
          box-shadow: none !important;
          padding: 4px 9px !important;
        }
        .piq-metro-tip::before { display:none !important; }
        .leaflet-control-zoom a {
          background: #1a1d27 !important;
          color: #e8eaf0 !important;
          border-color: rgba(255,255,255,0.12) !important;
        }
        .leaflet-control-zoom a:hover { background: #22263a !important; }
        .leaflet-control-attribution {
          background: rgba(13,21,32,0.6) !important;
          color: rgba(255,255,255,0.3) !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: rgba(255,255,255,0.4) !important; }
      `}</style>

      <div style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16 }}>

          {/* Map container */}
          <Card style={{ padding: 0, overflow: 'hidden', position: 'relative', background: '#0d1520' }}>
            {!ready && <LoadingBox h={540} />}

            {/* Leaflet mounts into this div — always rendered so ref is stable */}
            <div
              ref={mapDivRef}
              style={{ width: '100%', height: 540, display: ready ? 'block' : 'none' }}
            />

            {/* Fetching overlay */}
            {isLoading && ready && (
              <div style={{
                position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(13,21,32,0.88)', borderRadius: 6,
                padding: '5px 14px', fontSize: 11, color: 'var(--muted)',
                display: 'flex', alignItems: 'center', gap: 6, zIndex: 1000,
              }}>
                <span style={{
                  display: 'inline-block', width: 10, height: 10,
                  border: '2px solid var(--accent)', borderTopColor: 'transparent',
                  borderRadius: '50%', animation: 'mapspin 0.8s linear infinite',
                }} />
                Updating…
                <style>{`@keyframes mapspin { to { transform:rotate(360deg); } }`}</style>
              </div>
            )}

            {/* Legend */}
            <div style={{
              position: 'absolute', bottom: 38, right: 12, zIndex: 999,
              background: 'rgba(13,21,32,0.88)', borderRadius: 7,
              padding: '8px 12px', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intensity</div>
              {[
                ['#ff2200','Extreme'],
                ['#ef4444','Critical'],
                ['#f59e0b','High'],
                ['#6366f1','Low'],
                ['#0ea5e9','Minimal'],
              ].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{l}</span>
                </div>
              ))}
              <div style={{ marginTop: 5, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #14b8a6', background: 'rgba(20,184,166,0.2)' }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Metro station</span>
                </div>
              </div>
            </div>

            {/* Zone count */}
            {data && (
              <div style={{
                position: 'absolute', bottom: 38, left: 12, zIndex: 999,
                background: 'rgba(13,21,32,0.88)', borderRadius: 6,
                padding: '5px 10px', border: '1px solid rgba(255,255,255,0.07)',
                fontSize: 10, color: 'rgba(255,255,255,0.4)',
              }}>
                {data.total_points} zones · {minCount}+ violations
              </div>
            )}
          </Card>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>📊 Stats</div>
              {data ? (
                <div style={{ fontSize: 12, lineHeight: 2.1 }}>
                  {[
                    ['Zones shown', data.total_points],
                    ['Peak density', data.max_count?.toLocaleString()],
                    ['Filter', `${minCount}+ violations`],
                    ['Map style', mapStyle],
                    ['Coverage', 'BLR metro area'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>{k}</span>
                      <strong style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{v}</strong>
                    </div>
                  ))}
                </div>
              ) : <div style={{ color: 'var(--muted)', fontSize: 12 }}>Loading…</div>}
            </Card>

            <Card>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>🔴 Top Impact Junctions</div>
              {jData?.junctions?.map((j, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text)', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                      {j.junction_name?.replace(/^BTP\d+\s*-\s*/, '')}
                    </span>
                    <span style={{
                      color: j.impact_score >= 60 ? 'var(--red)' : j.impact_score >= 40 ? 'var(--amber)' : 'var(--green)',
                      fontWeight: 600, flexShrink: 0, marginLeft: 6,
                    }}>
                      {j.impact_score}
                    </span>
                  </div>
                  <ScoreBar score={Math.round(j.impact_score)} />
                </div>
              ))}
            </Card>

            <Card>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>ℹ️ How to read</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
                <p>Real map — zoom and pan freely.</p>
                <p style={{ marginTop: 4 }}>Each heat blob = violations in a 1km² grid cell.</p>
                <p style={{ marginTop: 4 }}>Teal circles = metro stations. Hover for name.</p>
                <p style={{ marginTop: 4 }}>Switch Dark / Street / Satellite above.</p>
                <p style={{ marginTop: 4 }}>Filter slider cuts low-count noise.</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}