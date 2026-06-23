import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'

const BENGALURU = [12.9716, 77.5946]

function loadLeaflet(cb) {
  if (window.L) { cb(); return }
  const addCSS = href => {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href
      document.head.appendChild(l)
    }
  }
  const addScript = (src, next) => {
    if (document.querySelector(`script[src="${src}"]`)) { next(); return }
    const s = document.createElement('script'); s.src = src; s.onload = next
    document.head.appendChild(s)
  }
  addCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css')
  addScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', () => {
    delete window.L.Icon.Default.prototype._getIconUrl
    cb()
  })
}

const RING_COLORS = {
  1: { fill: '#ef4444', stroke: '#ff6666', label: 'Ring 1 — ~1km' },
  2: { fill: '#f59e0b', stroke: '#fbbf24', label: 'Ring 2 — ~2km' },
}

export default function Cascade() {
  const mapDivRef  = useRef(null)
  const mapRef     = useRef(null)
  const markersRef = useRef([])
  const [ready, setReady] = useState(false)
  const [selected, setSelected] = useState(null)
  const [cellDetail, setCellDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const { data: hotspotsData, isLoading } = useQuery({
    queryKey: ['cascade-hotspots'],
    queryFn: () => api.get('/cascade/hotspots').then(r => r.data),
  })

  // Init map
  useEffect(() => {
    loadLeaflet(() => {
      if (mapRef.current || !mapDivRef.current) return
      const L = window.L
      const map = L.map(mapDivRef.current, { center: BENGALURU, zoom: 12, zoomControl: true })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO &copy; OSM', maxZoom: 19,
      }).addTo(map)
      mapRef.current = map
      setReady(true)
      setTimeout(() => map.invalidateSize(), 100)
    })
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [])

  // Add hotspot markers
  useEffect(() => {
    if (!ready || !mapRef.current || !hotspotsData?.hotspots) return
    const L = window.L
    markersRef.current.forEach(m => mapRef.current.removeLayer(m))
    markersRef.current = []

    const maxCount = Math.max(...hotspotsData.hotspots.map(h => h.count))

    hotspotsData.hotspots.forEach(h => {
      const intensity = h.count / maxCount
      const r = 6 + intensity * 16
      const color = intensity > 0.6 ? '#ef4444' : intensity > 0.3 ? '#f59e0b' : '#6366f1'

      const marker = L.circleMarker([h.lat, h.lng], {
        radius: r, fillColor: color, fillOpacity: 0.75,
        color: '#fff', weight: 1, opacity: 0.6,
      })
      .bindTooltip(`
        <b>${h.count.toLocaleString()} violations</b><br>
        ${h.neighbor_count} cascade neighbors<br>
        Click to see ripple effect
      `, { className: 'cas-tip' })
      .on('click', () => loadCellDetail(h))
      .addTo(mapRef.current)
      markersRef.current.push(marker)
    })
  }, [hotspotsData, ready])

  // Draw cascade ripple on selection
  useEffect(() => {
    if (!ready || !mapRef.current) return
    const L = window.L
    // Remove old ripple layers (stored with _isCascade flag)
    mapRef.current.eachLayer(layer => {
      if (layer._isCascade) mapRef.current.removeLayer(layer)
    })
    if (!cellDetail) return

    // Draw selected cell
    const origin = L.circleMarker([cellDetail.lat, cellDetail.lng], {
      radius: 18, fillColor: '#ffffff', fillOpacity: 0.15,
      color: '#ffffff', weight: 2.5, opacity: 0.9,
      dashArray: '5,4',
    }).addTo(mapRef.current)
    origin._isCascade = true

    // Draw neighbor ripple
    cellDetail.neighbors.forEach(nb => {
      const c = RING_COLORS[nb.ring] || RING_COLORS[2]
      const nbMarker = L.circleMarker([nb.lat, nb.lng], {
        radius: 8 + nb.cascade_risk * 14,
        fillColor: c.fill, fillOpacity: 0.5 + nb.cascade_risk * 0.3,
        color: c.stroke, weight: 1.5, opacity: 0.8,
      })
      .bindTooltip(`
        <b>Cascade Risk: ${Math.round(nb.cascade_risk * 100)}%</b><br>
        ${nb.count.toLocaleString()} violations<br>
        ${nb.dist_m}m from epicenter
      `, { className: 'cas-tip' })
      .addTo(mapRef.current)
      nbMarker._isCascade = true

      // Draw line from origin to neighbor
      const line = L.polyline([[cellDetail.lat, cellDetail.lng], [nb.lat, nb.lng]], {
        color: c.fill, weight: 1.5, opacity: 0.4, dashArray: '4,6',
      }).addTo(mapRef.current)
      line._isCascade = true
    })

    mapRef.current.setView([cellDetail.lat, cellDetail.lng], 13, { animate: true })
  }, [cellDetail, ready])

  async function loadCellDetail(h) {
    const [lg, lgg] = h.key.split('_')
    setSelected(h)
    setLoadingDetail(true)
    try {
      const res = await api.get(`/cascade/cell?lat_grid=${lg}&lng_grid=${lgg}`)
      setCellDetail(res.data)
    } finally {
      setLoadingDetail(false)
    }
  }

  const maxCascade = cellDetail?.neighbors?.[0]?.cascade_risk || 1

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        padding: '20px 24px 16px', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Congestion Cascade
          </h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '3px 0 0' }}>
            Click any hotspot to see which neighboring zones historically spike when that zone is overloaded
          </p>
        </div>
        <div style={{
          fontSize: 11, color: 'var(--muted)', background: 'var(--bg2)',
          padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
        }}>
          {hotspotsData?.hotspots?.length || 0} hotspot cells · Click to reveal cascade
        </div>
      </div>

      <style>{`
        .cas-tip { background: rgba(13,21,32,0.92) !important; border: 1px solid rgba(255,255,255,0.12) !important; color: #e8eaf0 !important; font-size: 11px !important; border-radius: 6px !important; box-shadow: none !important; padding: 5px 9px !important; }
        .cas-tip::before { display:none !important; }
        .leaflet-control-zoom a { background: #1a1d27 !important; color: #e8eaf0 !important; border-color: rgba(255,255,255,0.12) !important; }
        .leaflet-control-zoom a:hover { background: #22263a !important; }
        .leaflet-control-attribution { background: rgba(13,21,32,0.6) !important; color: rgba(255,255,255,0.3) !important; font-size: 9px !important; }
      `}</style>

      <div style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>

          {/* Map */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
            {!ready && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1520', zIndex: 500, fontSize: 13, color: 'var(--muted)' }}>
                Loading map…
              </div>
            )}
            <div ref={mapDivRef} style={{ width: '100%', height: 560 }} />

            {/* Legend */}
            <div style={{
              position: 'absolute', bottom: 30, right: 12, zIndex: 999,
              background: 'rgba(13,21,32,0.9)', borderRadius: 7,
              padding: '8px 12px', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Map Key</div>
              {[
                ['#ef4444', 'High-violation hotspot'],
                ['#f59e0b', 'Medium hotspot'],
                ['#6366f1', 'Low hotspot'],
              ].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{l}</span>
                </div>
              ))}
              <div style={{ marginTop: 5, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                {Object.values(RING_COLORS).map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.fill, opacity: 0.7 }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Selected cell detail */}
            {!selected && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '40px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>👆</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Click any hotspot on the map to see its congestion cascade</div>
              </div>
            )}

            {selected && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px' }}>
                  📍 Selected Hotspot
                </h3>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 2, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Violations</span>
                    <strong style={{ color: 'var(--red)', fontSize: 16 }}>{selected.count.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Intensity</span>
                    <strong style={{ color: 'var(--text)' }}>{Math.round(selected.intensity * 100)}% of peak</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cascade neighbors</span>
                    <strong style={{ color: 'var(--text)' }}>{selected.neighbor_count}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Coordinates</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text)' }}>{selected.lat?.toFixed(4)}, {selected.lng?.toFixed(4)}</span>
                  </div>
                </div>

                {loadingDetail && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading cascade data…</div>}

                {cellDetail && !loadingDetail && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
                      Cascade Ripple — {cellDetail.neighbors?.length} affected zones
                    </div>
                    {cellDetail.neighbors?.map((nb, i) => (
                      <div key={i} style={{
                        marginBottom: 8, padding: '8px 10px',
                        background: nb.ring === 1 ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
                        borderRadius: 7, borderLeft: `3px solid ${nb.ring === 1 ? '#ef4444' : '#f59e0b'}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: RING_COLORS[nb.ring]?.fill, fontWeight: 600 }}>
                            Ring {nb.ring} · {nb.dist_m}m
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 700 }}>
                            {Math.round(nb.cascade_risk * 100)}% risk
                          </span>
                        </div>
                        <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.round((nb.cascade_risk / maxCascade) * 100)}%`,
                            height: '100%',
                            background: RING_COLORS[nb.ring]?.fill,
                            borderRadius: 2,
                            transition: 'width 0.4s',
                          }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                          {nb.count.toLocaleString()} violations historically
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Explainer */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 10px' }}>
                📖 What is Cascade Risk?
              </h3>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
                <p>When a high-violation zone is overloaded, drivers spill onto neighboring streets — creating a cascade effect.</p>
                <p style={{ marginTop: 8 }}>Cascade risk = geometric mean of the epicenter's violation count and the neighbor's count, normalized to peak density. Cells with high counts on both sides have high mutual co-occurrence.</p>
                <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Ring 1</strong> = ~1km radius (immediate spillover)<br />
                <strong style={{ color: 'var(--text)' }}>Ring 2</strong> = ~2km radius (secondary cascade)</p>
                <p style={{ marginTop: 8 }}>Use this to pre-position enforcement <em>before</em> a zone hits critical density.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
