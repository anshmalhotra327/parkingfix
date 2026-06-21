import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'
import { PageHeader, Card, CardTitle, LoadingBox, ErrorBox, Grid, StatCard, ScoreBar, RiskBadge } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const TT = {
  contentStyle: { background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, fontSize: 12 },
  labelStyle: { color: '#8892a4' },
}

const RISK_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }
const PRESETS = [100, 300, 500, 750, 1000, 1500, 2000]

function fmtRadius(r) { return r >= 1000 ? `${(r/1000).toFixed(1)} km` : `${r} m` }

export default function Metro() {
  const [radius, setRadius] = useState(300)

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['metro', radius],
    queryFn: () => api.get(`/metro/zones?radius=${radius}`).then(r => r.data),
    staleTime: 0,
    cacheTime: 0,
  })

  const zones    = data?.metro_zones || []
  const highRisk = zones.filter(z => z.risk_level === 'high').length
  const total    = data?.total_violations || 0

  // Risk threshold values that scale with radius
  const hiThresh  = Math.round(500  * (radius / 300) ** 2).toLocaleString()
  const midThresh = Math.round(100  * (radius / 300) ** 2).toLocaleString()

  return (
    <div>
      <PageHeader
        title="Metro Zone Monitoring"
        subtitle="Parking violations within a configurable radius around each metro station"
      />
      <div style={{ padding: 24 }}>

        {/* Radius control */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Search Radius</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
                Violations counted within this distance of each station entrance
              </span>
            </div>
            <div style={{
              fontSize: 22, fontWeight: 700, color: 'var(--accent)',
              background: 'rgba(59,130,246,0.1)', padding: '4px 16px',
              borderRadius: 8, border: '1px solid rgba(59,130,246,0.25)',
              minWidth: 90, textAlign: 'center',
              opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.2s',
            }}>
              {fmtRadius(radius)}
            </div>
          </div>

          <input
            type="range" min={50} max={2000} step={50} value={radius}
            onChange={e => setRadius(Number(e.target.value))}
            style={{ width: '100%', height: 4, cursor: 'pointer', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 }}>
            {[50,500,1000,1500,2000].map(v => (
              <span key={v} style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtRadius(v)}</span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button key={p} onClick={() => setRadius(p)} style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12,
                cursor: 'pointer',
                border: `1px solid ${radius === p ? 'var(--accent)' : 'var(--border)'}`,
                background: radius === p ? 'rgba(59,130,246,0.15)' : 'var(--bg3)',
                color: radius === p ? 'var(--accent)' : 'var(--muted)',
                fontWeight: radius === p ? 700 : 400,
                transition: 'all 0.15s',
              }}>{fmtRadius(p)}</button>
            ))}
          </div>
        </Card>

        {/* KPIs */}
        <Grid cols={3} gap={14} style={{ marginBottom: 16 }}>
          <StatCard label="Stations Monitored" value={zones.length} color="var(--teal)" icon="🚇" />
          <StatCard
            label={`High Risk (${fmtRadius(radius)} radius)`}
            value={isFetching ? '…' : highRisk}
            color="var(--red)" icon="🔴"
            sub={`> ${hiThresh} violations`}
          />
          <StatCard
            label="Total Violations in Radius"
            value={isFetching ? '…' : total.toLocaleString()}
            color="var(--amber)" icon="📊"
            sub={`across all ${zones.length} stations`}
          />
        </Grid>

        {isLoading && <LoadingBox h={300} />}
        {error   && <ErrorBox />}

        {!isLoading && !error && (
          <>
            <Grid cols={2} gap={16} style={{ marginBottom: 16 }}>
              {/* Bar chart — always uses current radius data */}
              <Card style={{ opacity: isFetching ? 0.65 : 1, transition: 'opacity 0.2s' }}>
                <CardTitle>Violations by Station ({fmtRadius(radius)} radius)</CardTitle>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={zones} layout="vertical" barSize={18}>
                    <XAxis type="number" tick={{ fill:'#8892a4', fontSize:10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                    <YAxis type="category" dataKey="name" width={100}
                      tick={{ fill:'#8892a4', fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TT}
                      formatter={(v, _, p) => [v.toLocaleString(), `Violations (${fmtRadius(p.payload.radius_m ?? radius)})`]} />
                    <Bar dataKey="violations_in_radius" radius={[0,4,4,0]}>
                      {zones.map((z, i) => <Cell key={i} fill={RISK_COLOR[z.risk_level] || '#3b82f6'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Risk guide + peak hours */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <Card>
                  <CardTitle>Risk Thresholds at {fmtRadius(radius)}</CardTitle>
                  {[
                    { level:'high',   color:'var(--red)',   range:`> ${hiThresh}`,                      action:'Permanent enforcement post recommended' },
                    { level:'medium', color:'var(--amber)', range:`${midThresh} – ${hiThresh}`,          action:'Patrol during peak metro hours' },
                    { level:'low',    color:'var(--green)', range:`< ${midThresh}`,                      action:'Standard patrol schedule' },
                  ].map(r => (
                    <div key={r.level} style={{ display:'flex', gap:10, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ width:3, background:r.color, borderRadius:2, flexShrink:0, minHeight:44 }} />
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:r.color, textTransform:'uppercase', marginBottom:2 }}>
                          {r.level} — {r.range} violations
                        </div>
                        <div style={{ fontSize:11, color:'var(--text)' }}>→ {r.action}</div>
                      </div>
                    </div>
                  ))}
                </Card>

                <Card>
                  <CardTitle>Peak Hours Advisory</CardTitle>
                  {[
                    { time:'7:30 – 10:00 AM', label:'Morning rush', intensity:'high' },
                    { time:'12:00 – 2:00 PM', label:'Lunch peak',   intensity:'medium' },
                    { time:'5:30 – 8:30 PM',  label:'Evening rush', intensity:'high' },
                    { time:'10 PM – 6 AM',    label:'Off peak',     intensity:'low' },
                  ].map(r => (
                    <div key={r.time} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize:12, color:'var(--text)' }}>{r.time}</div>
                        <div style={{ fontSize:10, color:'var(--muted)' }}>{r.label}</div>
                      </div>
                      <RiskBadge level={r.intensity} />
                    </div>
                  ))}
                </Card>
              </div>
            </Grid>

            {/* Station cards — ALL use violations_in_radius from current API response */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, opacity: isFetching ? 0.65 : 1, transition:'opacity 0.2s' }}>
              {zones.map((z, i) => {
                const count = z.violations_in_radius ?? 0
                const maxCount = Math.max(...zones.map(x => x.violations_in_radius ?? 0), 1)
                const barPct = Math.round((count / maxCount) * 100)
                return (
                  <Card key={i} style={{ borderLeft:`3px solid ${RISK_COLOR[z.risk_level] || 'var(--border)'}`, transition:'border-color 0.3s' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>🚇 {z.name}</div>
                        <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>
                          {z.lat?.toFixed(4)}°N · {z.lng?.toFixed(4)}°E
                        </div>
                      </div>
                      <RiskBadge level={z.risk_level} />
                    </div>
                    <div style={{ fontSize:24, fontWeight:700, color:'var(--text)', marginBottom:2 }}>
                      {count.toLocaleString()}
                    </div>
                    {/* Dynamic label always reflects current radius */}
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>
                      violations within <strong style={{ color:'var(--text)' }}>{fmtRadius(z.radius_m ?? radius)}</strong>
                    </div>
                    <ScoreBar score={barPct} />
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
