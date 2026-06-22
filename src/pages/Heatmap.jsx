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
    delete window.L.Icon.Default.prototype._getIconUrl
    window.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
    addScript('https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js', cb)
  })
}

export default function Heatmap() {
  const mapDivRef = useRef(null)
  const mapRef    = useRef(null)
  const tileRef   = useRef(null)
  const heatRef   = useRef(null)
  const [ready, setReady]       = useState(false)
  const [minCount, setMinCount] = useState(5)
  const [mapStyle, setMapStyle] = useState('dark')

  const { data, isLoading } = useQuery({
    queryKey: ['heatmap', minCount],
    queryFn: () => api.get(`/analytics/heatmap?min_count=${minCount}`).then(r => r.data),
  })

  const { data: jData } = useQuery({
    queryKey: ['junctions-hm'],
    queryFn: () => api.get('/impact/junctions?top_n=8').then(r => r.data),
  })

  // ── Init map ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadLeaflet(() => {
      if (mapRef.current || !mapDivRef.current) return

      const L = window.L

      const map = L.map(mapDivRef.current, {
        center: BENGALURU,
        zoom: 12,
        zoomControl: true,
      })

      tileRef.current = L.tileLayer(MAP_TILES.dark.url, {
        attribution: MAP_TILES.dark.attr,
        maxZoom: 19,
      }).addTo(map)

      METRO_STATIONS.forEach(m => {
        L.circleMarker([m.lat, m.lng], {
          radius: 7, fillColor: '#14b8a6', fillOpacity: 0.5,
          color: '#14b8a6', weight: 2, opacity: 0.9,
        })
        .bindTooltip(`🚇 ${m.name}`, { permanent: false, direction: 'top', className: 'piq-tip' })
        .addTo(map)
      })

      mapRef.current = map
      map.invalidateSize()
      setReady(true)
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        tileRef.current = null
        heatRef.current = null
      }
    }
  }, [])

  // ── Heatmap layer with Dynamic Zoom Rescaling ───────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current || !data?.points) return
    const L = window.L

    mapRef.current.invalidateSize()

    // Helper to calculate smart configurations per zoom level to maintain structural context
    const getHeatSettings = (zoom) => {
      let radius = 25
      let blur = 15
      let maxIntensity = 1.0

      if (zoom >= 16) {
        radius = 75; blur = 35; maxIntensity = 0.2 // Spreads point definitions wide when deep zoomed in
      } else if (zoom >= 14) {
        radius = 50; blur = 25; maxIntensity = 0.5 
      } else if (zoom <= 11) {
        radius = 14; blur = 10; maxIntensity = 2.8 // Prevents color bleeding when zooming out
      }
      return { radius, blur, max: maxIntensity }
    }

    const maxC = data.max_count || 1
    const sqrtMax = Math.sqrt(maxC)
    
    const pts = data.points.map(p => [
      parseFloat(p.lat), 
      parseFloat(p.lng), 
      Math.sqrt(Number(p.count)) / sqrtMax
    ])

    const currentZoom = mapRef.current.getZoom()
    const settings = getHeatSettings(currentZoom)

    if (heatRef.current) {
      heatRef.current.setLatLngs(pts)
      heatRef.current.setOptions({
        radius: settings.radius,
        blur: settings.blur,
        max: settings.max
      })
    } else {
      heatRef.current = L.heatLayer(pts, {
        radius: settings.radius,
        blur: settings.blur,
        minOpacity: 0.35,   
        maxZoom: 18,
        max: settings.max,
        gradient: {
          '0.1': '#3b82f6',   // Low
          '0.4': '#8b5cf6',   // Med-Low
          '0.6': '#f59e0b',   // Med
          '0.8': '#ef4444',   // High
          '1.0': '#ffffff'    // Extreme Core
        },
      }).addTo(mapRef.current)
    }

    // Capture zoom adjustments on-the-fly
    const handleZoom = () => {
      if (!heatRef.current || !mapRef.current) return
      const newZoom = mapRef.current.getZoom()
      const newSettings = getHeatSettings(newZoom)
      
      heatRef.current.setOptions({
        radius: newSettings.radius,
        blur: newSettings.blur,
        max: newSettings.max
      })
    }

    mapRef.current.on('zoomend', handleZoom)

    return () => {
      if (mapRef.current) {
        mapRef.current.off('zoomend', handleZoom)
      }
    }
  }, [data, ready])

  // ── Tile style swap ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return
    const L = window.L
    if (tileRef.current) mapRef.current.removeLayer(tileRef.current)
    const t = MAP_TILES[mapStyle]
    tileRef.current = L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 })
    tileRef.current.addTo(mapRef.current)
    
    if (heatRef.current) {
      heatRef.current.bringToFront?.()
    }
  }, [mapStyle, ready])

  return (
    <div>
      <PageHeader
        title="Violation Heatmap"
        subtitle="Live map of parking violation density — zoom and pan freely"
        right={
          /* Mobile fix: Added dynamic flex wrapping style with maximum horizontal scroll support */
          <div className="map-controls-tray" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            maxWidth: '100vw',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '4px 0'
          }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', paddingLeft: 4 }}>Min:</span>
            {[3, 5, 10, 20].map(n => (
              <button key={n} onClick={() => setMinCount(n)} style={{
                padding: '4px 10px', borderRadius: 5, fontSize: 11,
                cursor: 'pointer', border: 'none', flexShrink: 0,
                background: minCount === n ? 'var(--accent)' : 'var(--bg3)',
                color: minCount === n ? '#fff' : 'var(--muted)',
              }}>{n}+</button>
            ))}
            <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
            {['dark', 'street', 'satellite'].map(s => (
              <button key={s} onClick={() => setMapStyle(s)} style={{
                padding: '4px 10px', borderRadius: 5, fontSize: 11,
                cursor: 'pointer', border: 'none', textTransform: 'capitalize', flexShrink: 0,
                background: mapStyle === s ? '#6366f1' : 'var(--bg3)',
                color: mapStyle === s ? '#fff' : 'var(--muted)',
              }}>{s}</button>
            ))}
          </div>
        }
      />

      <style>{`
        /* Responsive CSS utilities */
        .piq-tip {
          background: rgba(13,21,32,0.92) !important;
          border: 1px solid rgba(20,184,166,0.45) !important;
          color: #e8eaf0 !important; font-size: 12px !important;
          border-radius: 6px !important; box-shadow: none !important;
          padding: 4px 9px !important;
        }
        .piq-tip::before { display: none !important; }
        .leaflet-control-zoom a {
          background: #1a1d27 !important; color: #e8eaf0 !important;
          border-color: rgba(255,255,255,0.12) !important;
        }
        .leaflet-control-zoom a:hover { background: #22263a !important; }
        .leaflet-control-attribution {
          background: rgba(13,21,32,0.6) !important;
          color: rgba(255,255,255,0.3) !important; font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: rgba(255,255,255,0.4) !important; }
        
        .map-controls-tray::-webkit-scrollbar { display: none; } /* Hide track lines on mobile interfaces */
        
        .layout-grid {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 16px;
        }

        @media (max-width: 900px) {
          .layout-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={{ padding: '12px md:24px' }}>
        <div className="layout-grid">

          <Card style={{ padding: 0, overflow: 'hidden', position: 'relative', background: '#0d1520' }}>
            <div
              ref={mapDivRef}
              style={{ width: '100%', height: 540 }}
            />

            {!ready && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: '#0d1520', zIndex: 500,
              }}>
                <LoadingBox h={540} />
              </div>
            )}

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
                  borderRadius: '50%', animation: 'piqspin 0.8s linear infinite',
                }} />
                Updating…
                <style>{`@keyframes piqspin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            <div style={{
              position: 'absolute', bottom: 38, right: 12, zIndex: 999,
              background: 'rgba(13,21,32,0.88)', borderRadius: 7,
              padding: '8px 12px', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intensity</div>
              {[
                ['#ffffff', 'Extreme'],
                ['#ef4444', 'Critical'],
                ['#f59e0b', 'High'],
                ['#8b5cf6', 'Medium'],
                ['#3b82f6', 'Minimal'],
              ].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, border: c === '#ffffff' ? '1px solid #ccc' : 'none' }} />
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
                    ['Zones shown',   data.total_points],
                    ['Peak density',  data.max_count?.toLocaleString()],
                    ['Filter',        `${minCount}+ violations`],
                    ['Map style',     mapStyle],
                    ['Coverage',      'BLR metro area'],
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
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}