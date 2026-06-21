import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { api } from '../utils/api'
import { PageHeader, Card, LoadingBox, ScoreBar } from '../components/UI'

// Tight bounds around actual Bengaluru violation data
const LAT_MIN = 12.86, LAT_MAX = 13.08
const LNG_MIN = 77.49, LNG_MAX = 77.72

// Key Bengaluru landmarks for orientation
const LANDMARKS = [
  { name: 'KR Market',      lat: 12.9679, lng: 77.5759 },
  { name: 'MG Road',        lat: 12.9756, lng: 77.6099 },
  { name: 'Majestic',       lat: 12.9767, lng: 77.5713 },
  { name: 'Shivajinagar',   lat: 12.9902, lng: 77.5980 },
  { name: 'Malleshwaram',   lat: 13.0035, lng: 77.5701 },
  { name: 'Indiranagar',    lat: 12.9784, lng: 77.6408 },
  { name: 'Jayanagar',      lat: 12.9308, lng: 77.5832 },
  { name: 'Koramangala',    lat: 12.9352, lng: 77.6245 },
  { name: 'Rajajinagar',    lat: 12.9919, lng: 77.5511 },
  { name: 'Whitefield',     lat: 12.9698, lng: 77.7499 },
  { name: 'Banashankari',   lat: 12.9255, lng: 77.5468 },
  { name: 'Hebbal',         lat: 13.0450, lng: 77.5940 },
]

// Metro stations
const METRO = [
  { name: 'Majestic',    lat: 12.9767, lng: 77.5713 },
  { name: 'MG Road',     lat: 12.9756, lng: 77.6099 },
  { name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
  { name: 'Rajajinagar', lat: 12.9919, lng: 77.5511 },
  { name: 'Hosahalli',   lat: 12.9776, lng: 77.5188 },
  { name: 'Nagasandra',  lat: 13.0484, lng: 77.5133 },
  { name: 'Hebbal',      lat: 13.0350, lng: 77.5940 },
]

export default function Heatmap() {
  const canvasRef = useRef(null)
  const [minCount, setMinCount] = useState(5)
  const [hoveredZone, setHoveredZone] = useState(null)
  const pointsRef = useRef([])

  const { data, isLoading } = useQuery({
    queryKey: ['heatmap', minCount],
    queryFn: () => api.get(`/analytics/heatmap?min_count=${minCount}`).then(r => r.data),
  })

  const { data: jData } = useQuery({
    queryKey: ['junctions-hm'],
    queryFn: () => api.get('/impact/junctions?top_n=8').then(r => r.data),
  })

  // Convert lat/lng to canvas x/y
  const toXY = (lat, lng, W, H) => ({
    x: ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W,
    y: H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * H,
  })

  useEffect(() => {
    if (!data?.points || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const W = canvas.width  = canvas.offsetWidth
    const H = canvas.height = canvas.offsetHeight

    // ── Background: dark map-like gradient ───────────────────
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0,   '#0d1520')
    bg.addColorStop(0.5, '#101820')
    bg.addColorStop(1,   '#0d1520')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // ── Grid: faint lat/lng lines ─────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 0.5
    const latSteps = 6, lngSteps = 8
    for (let i = 0; i <= latSteps; i++) {
      const lat = LAT_MIN + (LAT_MAX - LAT_MIN) * (i / latSteps)
      const { y } = toXY(lat, LNG_MIN, W, H)
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.font = '9px monospace'
      ctx.fillText(lat.toFixed(2) + '°', 4, y - 2)
    }
    for (let i = 0; i <= lngSteps; i++) {
      const lng = LNG_MIN + (LNG_MAX - LNG_MIN) * (i / lngSteps)
      const { x } = toXY(LAT_MIN, lng, W, H)
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.font = '9px monospace'
      ctx.fillText(lng.toFixed(2) + '°', x + 2, H - 4)
    }

    // ── Heatmap blobs ─────────────────────────────────────────
    const maxC = data.max_count || 1
    const rendered = []

    // Sort descending so high-intensity renders last (on top)
    const sorted = [...data.points].sort((a, b) => a.count - b.count)

    sorted.forEach(p => {
      const { x, y } = toXY(p.lat, p.lng, W, H)
      const intensity = p.count / maxC
      const r = 8 + intensity * 38   // blob radius: 8–46px

      const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
      if (intensity > 0.6) {
        grad.addColorStop(0,   `rgba(255, 50,  30,  ${0.55 + intensity * 0.35})`)
        grad.addColorStop(0.3, `rgba(255,100,  20,  ${0.3  + intensity * 0.2})`)
        grad.addColorStop(0.7, `rgba(255,160,   0,  ${0.12 + intensity * 0.1})`)
        grad.addColorStop(1,   'rgba(0,0,0,0)')
      } else if (intensity > 0.25) {
        grad.addColorStop(0,   `rgba(245,158,  11, ${0.5 + intensity * 0.3})`)
        grad.addColorStop(0.4, `rgba(234,179,   8, ${0.2 + intensity * 0.2})`)
        grad.addColorStop(1,   'rgba(0,0,0,0)')
      } else {
        grad.addColorStop(0,   `rgba( 59,130, 246, ${0.35 + intensity * 0.3})`)
        grad.addColorStop(0.5, `rgba( 99,102, 241, ${0.12 + intensity * 0.1})`)
        grad.addColorStop(1,   'rgba(0,0,0,0)')
      }

      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()

      rendered.push({ x, y, r: Math.max(8, r * 0.5), count: p.count, lat: p.lat, lng: p.lng })
    })
    pointsRef.current = rendered
    ctx.globalCompositeOperation = 'source-over'

    // ── Landmark dots ─────────────────────────────────────────
    LANDMARKS.forEach(lm => {
      const { x, y } = toXY(lm.lat, lm.lng, W, H)
      // dot
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fill()
      // label
      ctx.font = '10px -apple-system, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.fillText(lm.name, x + 5, y + 3)
    })

    // ── Metro station markers ─────────────────────────────────
    METRO.forEach(m => {
      const { x, y } = toXY(m.lat, m.lng, W, H)
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(20,184,166,0.3)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(20,184,166,0.8)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })

    // ── Compass rose ──────────────────────────────────────────
    const cx = W - 28, cy = 28
    ctx.font = 'bold 11px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.textAlign = 'center'
    ctx.fillText('N', cx, cy - 12)
    ctx.fillText('S', cx, cy + 18)
    ctx.fillText('W', cx - 14, cy + 4)
    ctx.fillText('E', cx + 14, cy + 4)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.stroke()
    ctx.textAlign = 'left'

    // ── Scale bar ─────────────────────────────────────────────
    // ~5km in pixels at this zoom
    const km5px = (5 / 111) / (LNG_MAX - LNG_MIN) * W
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(16, H - 22); ctx.lineTo(16 + km5px, H - 22); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(16, H - 18); ctx.lineTo(16, H - 26); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(16 + km5px, H - 18); ctx.lineTo(16 + km5px, H - 26); ctx.stroke()
    ctx.font = '10px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText('5 km', 16 + km5px / 2 - 10, H - 26)

    // ── Zone count ────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.font = '10px monospace'
    ctx.fillText(`${data.total_points} zones · ${minCount}+ violations`, 16, H - 8)

  }, [data, minCount])

  // Mouse hover to show zone info
  const handleMouseMove = (e) => {
    if (!canvasRef.current || !pointsRef.current.length) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const W = canvasRef.current.offsetWidth
    const H = canvasRef.current.offsetHeight
    // find nearest point
    let best = null, bestD = 30
    pointsRef.current.forEach(p => {
      const d = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2)
      if (d < bestD) { bestD = d; best = p }
    })
    if (best) {
      setHoveredZone({ ...best, px: mx, py: my })
    } else {
      setHoveredZone(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Violation Heatmap"
        subtitle="Geographic density of parking violations across Bengaluru"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Min violations:</span>
            {[3, 5, 10, 20].map(n => (
              <button key={n} onClick={() => setMinCount(n)} style={{
                padding: '4px 12px', borderRadius: 5, fontSize: 11, cursor: 'pointer', border: 'none',
                background: minCount === n ? 'var(--accent)' : 'var(--bg3)',
                color: minCount === n ? '#fff' : 'var(--muted)',
              }}>{n}+</button>
            ))}
          </div>
        }
      />

      <div style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16 }}>

          {/* Map canvas */}
          <Card style={{ padding: 0, overflow: 'hidden', position: 'relative', background: '#0d1520' }}>
            {isLoading && <LoadingBox h={520} />}
            {!isLoading && (
              <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredZone(null)}
                style={{ width: '100%', height: 520, display: 'block', cursor: 'crosshair' }}
              />
            )}

            {/* Hover tooltip */}
            {hoveredZone && (
              <div style={{
                position: 'absolute',
                left: hoveredZone.px + 12,
                top: hoveredZone.py - 10,
                background: 'rgba(15,17,23,0.92)',
                border: '1px solid var(--border)',
                borderRadius: 7, padding: '7px 10px',
                fontSize: 11, color: 'var(--text)',
                pointerEvents: 'none', zIndex: 10,
                backdropFilter: 'blur(6px)',
              }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>📍 Zone</div>
                <div style={{ color: 'var(--muted)' }}>{hoveredZone.lat.toFixed(4)}°N, {hoveredZone.lng.toFixed(4)}°E</div>
                <div style={{ color: 'var(--red)', fontWeight: 600, marginTop: 3 }}>{hoveredZone.count.toLocaleString()} violations</div>
              </div>
            )}

            {/* Legend */}
            <div style={{
              position: 'absolute', bottom: 38, right: 12,
              background: 'rgba(13,21,32,0.85)', borderRadius: 7,
              padding: '8px 12px', backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intensity</div>
              {[
                ['#ef4444', 'Critical (>60%)'],
                ['#f59e0b', 'High (25–60%)'],
                ['#3b82f6', 'Low (<25%)'],
              ].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.85 }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>{l}</span>
                </div>
              ))}
              <div style={{ marginTop: 6, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #14b8a6', background: 'rgba(20,184,166,0.2)' }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Metro station</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>📊 Stats</div>
              {data && (
                <div style={{ fontSize: 12, lineHeight: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Zones shown</span>
                    <strong style={{ color: 'var(--text)' }}>{data.total_points}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Peak density</span>
                    <strong style={{ color: 'var(--red)' }}>{data.max_count?.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Filter</span>
                    <strong style={{ color: 'var(--text)' }}>{minCount}+ violations</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Coverage</span>
                    <strong style={{ color: 'var(--text)' }}>BLR metro</strong>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>🔴 Top Impact Junctions</div>
              {jData?.junctions?.map((j, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text)', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                      {j.junction_name?.replace(/^BTP\d+\s*-\s*/, '')}
                    </span>
                    <span style={{ color: j.impact_score >= 60 ? 'var(--red)' : j.impact_score >= 40 ? 'var(--amber)' : 'var(--green)', fontWeight: 600, flexShrink: 0, marginLeft: 6 }}>
                      {j.impact_score}
                    </span>
                  </div>
                  <ScoreBar score={Math.round(j.impact_score)} />
                </div>
              ))}
            </Card>

            <Card>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>ℹ️ How to read</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
                <p>Each blob = a 1km² grid cell. Size and colour show violation density.</p>
                <p style={{ marginTop: 6 }}>Hover over any cluster to see exact count and coordinates.</p>
                <p style={{ marginTop: 6 }}>Teal rings = metro stations. White dots = key areas.</p>
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}
