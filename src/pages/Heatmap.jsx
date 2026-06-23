import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { api } from '../utils/api'
import { PageHeader, Card, LoadingBox, ScoreBar } from '../components/UI'

const BENGALURU = { lat: 12.9716, lng: 77.5946 }

const METRO_STATIONS = [
  { name: 'Majestic',      lat: 12.9767, lng: 77.5713 },
  { name: 'MG Road',        lat: 12.9756, lng: 77.6099 },
  { name: 'Indiranagar',    lat: 12.9784, lng: 77.6408 },
  { name: 'Rajajinagar',    lat: 12.9919, lng: 77.5511 },
  { name: 'Hosahalli',      lat: 12.9776, lng: 77.5188 },
  { name: 'Nagasandra',     lat: 13.0484, lng: 77.5133 },
  { name: 'Byappanahalli',  lat: 12.9926, lng: 77.6478 },
  { name: 'Vijayanagar',    lat: 12.9673, lng: 77.5310 },
  { name: 'Yelachenahalli', lat: 12.8934, lng: 77.5877 },
]

// MapmyIndia Mappls Native Style Mapping
const MAP_STYLES = {
  dark: 'submission',       // Dark / Night view
  street: 'standard',     // Standard colorful street layout
  satellite: 'hybrid'      // High-res satellite imagery
}

function loadMappls(cb) {
  if (window.mappls && window.mappls.Heatmap) { cb(); return }

  const addScript = (src, next) => {
    if (document.querySelector(`script[src*="${src.split('?')[0]}"]`)) { next(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = next; document.head.appendChild(s)
  }

  // Injecting MapmyIndia main Vector SDK along with the native WebGL Heatmap Plugin
  // Note: Replace "YOUR_MAPMYINDIA_API_KEY" with your actual Mappls key/token if needed, or pass it via client header keys.
  const API_KEY = "YOUR_MAPMYINDIA_API_KEY";
  addScript(`https://apis.mappls.com/advancedmaps/api/v1/${API_KEY}/map_sdk?layer=vector&v=3.0&plugins=heatmap`, cb)
}

export default function Heatmap() {
  const mapDivRef = useRef(null)
  const mapRef    = useRef(null)
  const heatRef   = useRef(null)
  const markersRef = useRef([])
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

  // ── Init Mappls Instance ──────────────────────────────────────────────────
  useEffect(() => {
    loadMappls(() => {
      if (mapRef.current || !mapDivRef.current) return

      const mapplsObj = window.mappls

      const map = new mapplsObj.Map(mapDivRef.current, {
        center: [BENGALURU.lat, BENGALURU.lng],
        zoom: 12,
        zoomControl: true,
        style: MAP_STYLES.dark
      })

      map.addListener('load', () => {
        // Render Metro Station Markers using Mappls Canvas layers
        METRO_STATIONS.forEach(m => {
          const marker = new mapplsObj.Marker({
            map: map,
            position: { lat: m.lat, lng: m.lng },
            icon_url: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', // Reusing asset fallback
            width: 20,
            height: 30,
            popupHtml: `<div class="piq-tip" style="color:#fff; padding:4px;">🚇 ${m.name}</div>`
          })
          markersRef.current.push(marker)
        })

        mapRef.current = map
        setReady(true)
      })
    })

    return () => {
      if (mapRef.current) {
        // Clean up memory leaks from Canvas frames
        try {
          if (heatRef.current && heatRef.current.remove) heatRef.current.remove()
          markersRef.current.forEach(m => m.setMap(null))
        } catch (e) { console.error(e) }
        mapRef.current = null
        heatRef.current = null
        markersRef.current = []
      }
    }
  }, [])

  // ── Native Vector Heatmap Layer ──────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current || !data?.points) return
    const mapplsObj = window.mappls

    // Formats points to Mappls specification GeoJSON collection
    const geoJsonData = {
      type: "FeatureCollection",
      features: data.points.map(p => ({
        type: "Feature",
        properties: { weight: parseFloat(p.count) },
        geometry: { type: "Point", coordinates: [parseFloat(p.lng), parseFloat(p.lat)] }
      }))
    }

    if (heatRef.current) {
      // If the heatmap layer already exists, update its datasets directly
      heatRef.current.setData(geoJsonData)
    } else {
      // Initialize optimized WebGL canvas engine for smooth spatial operations
      heatRef.current = new mapplsObj.Heatmap({
        map: mapRef.current,
        data: geoJsonData,
        radius: 18,
        opacity: 0.85,
        property: "weight",
        gradient: [
          'rgba(59, 130, 246, 0)',   // Transparent core
          '#3b82f6',                 // Minimal
          '#8b5cf6',                 // Medium
          '#f59e0b',                 // High
          '#ef4444',                 // Critical
          '#ffffff'                  // Extreme Core
        ]
      })
    }
  }, [data, ready])

  // ── Style changes directly via Mappls core engine ────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return
    const targetStyle = MAP_STYLES[mapStyle] || MAP_STYLES.dark
    mapRef.current.setStyle(targetStyle)
  }, [mapStyle, ready])

  return (
    <div>
      <PageHeader
        title="Violation Heatmap"
        subtitle="Live map of parking violation density — powered by MapmyIndia"
        right={
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
        .piq-tip {
          background: rgba(13,21,32,0.92) !important;
          border: 1px solid rgba(20,184,166,0.45) !important;
          color: #e8eaf0 !important; font-size: 12px !important;
          border-radius: 6px !important; padding: 4px 9px !important;
        }
        .map-controls-tray::-webkit-scrollbar { display: none; } 
        
        .layout-grid {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 16px;
        }
        @media (max-width: 900px) {
          .layout-grid { grid-template-columns: 1fr; }
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
                    ['Map engine',    'Mappls Web SDK'],
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
                <p>Vector Map — zoom and pan seamlessly via MapmyIndia.</p>
                <p style={{ marginTop: 4 }}>WebGL blobs = sub-locality violations.</p>
                <p style={{ marginTop: 4 }}>Pin drops = metro station access links.</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}