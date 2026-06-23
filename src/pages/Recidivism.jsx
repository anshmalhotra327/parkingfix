import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'

const URGENCY_COLOR = {
  critical: { bg: 'rgba(239,68,68,0.15)',   border: '#ef4444', text: '#f87171', label: 'ANPR + Patrol' },
  high:     { bg: 'rgba(245,158,11,0.15)',  border: '#f59e0b', text: '#fbbf24', label: 'Notify Station' },
  medium:   { bg: 'rgba(99,102,241,0.15)',  border: '#6366f1', text: '#a5b4fc', label: 'Watch List' },
  low:      { bg: 'rgba(16,185,129,0.15)',  border: '#10b981', text: '#34d399', label: 'Monitor' },
}

function ProbBar({ prob }) {
  const pct = Math.round(prob * 100)
  const color = pct >= 70 ? '#ef4444' : pct >= 50 ? '#f59e0b' : pct >= 30 ? '#6366f1' : '#10b981'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36 }}>{pct}%</span>
    </div>
  )
}

function FeatureBar({ label, value }) {
  const pct = Math.round(value * 100)
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{label}</span>
        <span style={{ fontSize: 10, color: 'var(--text)' }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
      </div>
    </div>
  )
}

export default function Recidivism() {
  const [urgencyFilter, setUrgencyFilter] = useState('')
  const [plateInput, setPlateInput] = useState('')
  const [lookupPlate, setLookupPlate] = useState(null)
  const [expandedRow, setExpandedRow] = useState(null)

  const { data: summary } = useQuery({
    queryKey: ['recidivism-summary'],
    queryFn: () => api.get('/recidivism').then(r => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['recidivism-watchlist', urgencyFilter],
    queryFn: () => api.get(`/recidivism/watchlist?limit=50${urgencyFilter ? `&urgency=${urgencyFilter}` : ''}`).then(r => r.data),
  })

  const { data: lookupResult, isLoading: lookupLoading } = useQuery({
    queryKey: ['recidivism-lookup', lookupPlate],
    queryFn: () => lookupPlate ? api.get(`/recidivism/lookup?plate=${lookupPlate}`).then(r => r.data) : null,
    enabled: !!lookupPlate,
  })

  const watchlist = data?.watchlist || []
  const s = data?.summary || {}

  const FEATURE_LABELS = {
    recency:               'Recency (recent violations)',
    frequency:             'Frequency (total violations)',
    velocity:              'Velocity (violations/day)',
    location_concentration:'Location concentration',
    time_consistency:      'Peak-hour consistency',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px 16px', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Recidivism Risk Engine
          </h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '3px 0 0' }}>
            ML-powered re-offense probability scoring · Logistic regression on 5 behavioural features
          </p>
        </div>
        <div style={{
          fontSize: 11, color: 'var(--muted)', background: 'var(--bg2)',
          padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
        }}>
          🧠 Model: Logistic Regression · 500 vehicles scored
        </div>
      </div>

      <div style={{ padding: 24 }}>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'ANPR + Patrol', count: s.critical, color: '#ef4444', icon: '🚨', urgency: 'critical' },
            { label: 'Notify Station', count: s.high,     color: '#f59e0b', icon: '📡', urgency: 'high' },
            { label: 'Watch List',    count: s.medium,    color: '#6366f1', icon: '👁', urgency: 'medium' },
            { label: 'Monitor',       count: s.low,       color: '#10b981', icon: '✓',  urgency: 'low' },
          ].map(k => (
            <div key={k.label} onClick={() => setUrgencyFilter(urgencyFilter === k.urgency ? '' : k.urgency)}
              style={{
                background: urgencyFilter === k.urgency ? `${k.color}20` : 'var(--bg2)',
                border: `1px solid ${urgencyFilter === k.urgency ? k.color : 'var(--border)'}`,
                borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</span>
                <span style={{ fontSize: 16 }}>{k.icon}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1, marginTop: 6 }}>{k.count ?? '—'}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>vehicles</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

          {/* Watchlist table */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                Re-offense Watchlist {urgencyFilter && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· filtered: {urgencyFilter}</span>}
              </h3>
              <div style={{ display: 'flex', gap: 5 }}>
                {['', 'critical', 'high', 'medium', 'low'].map(u => (
                  <button key={u} onClick={() => setUrgencyFilter(u)} style={{
                    padding: '3px 9px', borderRadius: 5, fontSize: 11, cursor: 'pointer', border: 'none',
                    background: urgencyFilter === u ? 'var(--accent)' : 'var(--bg3)',
                    color: urgencyFilter === u ? '#fff' : 'var(--muted)',
                    textTransform: 'capitalize',
                  }}>{u || 'All'}</button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Loading watchlist…</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['#', 'Vehicle', 'Re-offense Prob', 'Days Since Last', 'Violations', 'Action', ''].map(h => (
                        <th key={h} style={{
                          fontSize: 10, color: 'var(--muted)', fontWeight: 500,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          padding: '7px 12px', textAlign: 'left',
                          borderBottom: '1px solid var(--border)',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {watchlist.map((r, i) => {
                      const u = URGENCY_COLOR[r.urgency] || URGENCY_COLOR.low
                      const isExp = expandedRow === r.vehicle_number
                      return [
                        <tr key={r.vehicle_number}
                          onClick={() => setExpandedRow(isExp ? null : r.vehicle_number)}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)' }}>{i + 1}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <code style={{ fontSize: 12, color: 'var(--accent)' }}>{r.vehicle_number}</code>
                          </td>
                          <td style={{ padding: '10px 12px', minWidth: 150 }}>
                            <ProbBar prob={r.reoffense_prob} />
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text)' }}>
                            {r.days_since_last}d ago
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text)' }}>
                            {r.total_violations}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              fontSize: 10, padding: '2px 8px', borderRadius: 4,
                              background: u.bg, color: u.text, fontWeight: 600,
                              border: `1px solid ${u.border}20`,
                              whiteSpace: 'nowrap',
                            }}>{r.action}</span>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)' }}>
                            {isExp ? '▲' : '▼'}
                          </td>
                        </tr>,
                        isExp && (
                          <tr key={`${r.vehicle_number}-exp`}>
                            <td colSpan={7} style={{ padding: '0 12px 14px 12px', background: 'rgba(255,255,255,0.02)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 12 }}>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
                                    Feature Breakdown — why this score?
                                  </div>
                                  {Object.entries(r.features || {}).map(([k, v]) => (
                                    <FeatureBar key={k} label={FEATURE_LABELS[k] || k} value={v} />
                                  ))}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.9 }}>
                                  <div><strong style={{ color: 'var(--text)' }}>Last seen:</strong> {r.last_seen}</div>
                                  <div><strong style={{ color: 'var(--text)' }}>Rate:</strong> {r.violation_rate}/day</div>
                                  <div><strong style={{ color: 'var(--text)' }}>Stations hit:</strong> {r.police_stations}</div>
                                  <div><strong style={{ color: 'var(--text)' }}>Risk score:</strong> {r.risk_score}</div>
                                  <div style={{ marginTop: 8, padding: '7px 10px', background: `${URGENCY_COLOR[r.urgency]?.border}18`, borderLeft: `3px solid ${URGENCY_COLOR[r.urgency]?.border}`, borderRadius: '0 6px 6px 0' }}>
                                    <strong style={{ color: URGENCY_COLOR[r.urgency]?.text }}>Recommended:</strong>{' '}
                                    <span style={{ color: 'var(--text)' }}>{r.action}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )
                      ]
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Plate lookup */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px' }}>
                🔍 Vehicle Re-offense Lookup
              </h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  value={plateInput}
                  onChange={e => setPlateInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && setLookupPlate(plateInput)}
                  placeholder="Enter vehicle number"
                  style={{
                    flex: 1, padding: '8px 10px', background: 'var(--bg3)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7,
                    color: '#e8eaf0', fontSize: 13, outline: 'none',
                  }}
                />
                <button onClick={() => setLookupPlate(plateInput)} style={{
                  padding: '8px 14px', background: 'var(--accent)', border: 'none',
                  borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>Score</button>
              </div>

              {lookupLoading && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Scoring…</div>}
              {lookupResult && (
                lookupResult.found ? (
                  <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <code style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>{lookupResult.vehicle_number}</code>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 4,
                        background: URGENCY_COLOR[lookupResult.urgency]?.bg,
                        color: URGENCY_COLOR[lookupResult.urgency]?.text,
                        fontWeight: 700, textTransform: 'uppercase',
                      }}>{lookupResult.urgency}</span>
                    </div>
                    <ProbBar prob={lookupResult.reoffense_prob} />
                    <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', lineHeight: 1.9 }}>
                      <div>Total violations: <strong style={{ color: 'var(--text)' }}>{lookupResult.total_violations}</strong></div>
                      <div>Days since last: <strong style={{ color: 'var(--text)' }}>{lookupResult.days_since_last}d</strong></div>
                      <div>Violation rate: <strong style={{ color: 'var(--text)' }}>{lookupResult.violation_rate}/day</strong></div>
                    </div>
                    <div style={{ marginTop: 10, padding: '8px 10px', background: `${URGENCY_COLOR[lookupResult.urgency]?.border}18`, borderRadius: 6, borderLeft: `3px solid ${URGENCY_COLOR[lookupResult.urgency]?.border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: URGENCY_COLOR[lookupResult.urgency]?.text }}>Recommended Action</div>
                      <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 2 }}>{lookupResult.action}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--green)', padding: '8px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: 6 }}>
                    ✅ {lookupResult.vehicle_number} — not in high-risk registry
                  </div>
                )
              )}
            </div>

            {/* How the model works */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 12px' }}>
                🧠 How the Model Works
              </h3>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
                <p>A <strong style={{ color: 'var(--text)' }}>logistic regression</strong> on 5 vehicle-level features computes re-offense probability:</p>
                <div style={{ margin: '10px 0' }}>
                  {[
                    ['35%', 'Recency decay', 'Exp(-days_since/30) — recent = higher risk'],
                    ['25%', 'Frequency', 'Total violations normalized to 50'],
                    ['20%', 'Velocity', 'Violations per active day'],
                    ['12%', 'Location focus', 'Fewer stations = habitual spot'],
                    ['8%',  'Time pattern', 'Peak-hour violation ratio'],
                  ].map(([w, name, desc]) => (
                    <div key={name} style={{ display: 'flex', gap: 8, marginBottom: 7, padding: '5px 8px', background: 'var(--bg3)', borderRadius: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', minWidth: 28 }}>{w}</span>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text)', fontWeight: 500 }}>{name}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ color: 'var(--text)', fontSize: 10 }}>Output passed through logistic sigmoid → probability 0–100%</p>
              </div>
            </div>

            {/* Action guide */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 10px' }}>Action Guide</h3>
              {[
                { range: '> 80%', action: 'ANPR camera flag + immediate patrol dispatch', color: '#ef4444' },
                { range: '60–80%', action: 'Notify nearest precinct commander', color: '#f59e0b' },
                { range: '40–60%', action: 'Add to 7-day active watch list', color: '#6366f1' },
                { range: '< 40%', action: 'Passive monitoring only', color: '#10b981' },
              ].map(r => (
                <div key={r.range} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 3, background: r.color, borderRadius: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: r.color }}>{r.range}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{r.action}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
