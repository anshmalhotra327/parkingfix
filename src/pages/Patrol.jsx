import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../utils/api'
import { useAuth } from '../utils/api'
import { PageHeader, Card, CardTitle, Table, LoadingBox, ErrorBox, Grid, StatCard, Select, Btn, RiskBadge } from '../components/UI'

const STATIONS = ['Upparpet','Shivajinagar','Malleshwaram','HAL Old Airport','City Market','Vijayanagara','Rajajinagar','Kodigehalli','Madiwala','Bellandur']

export default function Patrol() {
  const { officer } = useAuth()
  const qc = useQueryClient()
  const [station, setStation] = useState(officer?.station || 'Upparpet')
  const [hour, setHour] = useState(new Date().getHours())

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['patrol', station, hour],
    queryFn: () => api.get(`/patrol/recommendations?station=${encodeURIComponent(station)}&hour=${hour}`).then(r => r.data),
  })

  const { data: active } = useQuery({
    queryKey: ['active-recs'],
    queryFn: () => api.get('/patrol/active').then(r => r.data),
    refetchInterval: 20000,
  })

  const approve = useMutation({
    mutationFn: (id) => api.post(`/patrol/approve?id=${id}`),
    onSuccess: () => qc.invalidateQueries(['active-recs'])
  })
  const dismiss = useMutation({
    mutationFn: (id) => api.post(`/patrol/dismiss?id=${id}`),
    onSuccess: () => qc.invalidateQueries(['active-recs'])
  })

  return (
    <div>
      <PageHeader title="Smart Patrol & Deployment" subtitle="AI-generated patrol recommendations by station and shift" />
      <div style={{ padding:24 }}>

        {/* Controls */}
        <Card style={{ marginBottom:16 }}>
          <CardTitle>Generate Recommendation</CardTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12, alignItems:'flex-end' }}>
            <Select label="Police Station" value={station} onChange={e=>setStation(e.target.value)}>
              {STATIONS.map(s=><option key={s}>{s}</option>)}
            </Select>
            <Select label="Shift Hour" value={hour} onChange={e=>setHour(Number(e.target.value))}>
              {Array.from({length:24},(_,i)=>(
                <option key={i} value={i}>{String(i).padStart(2,'0')}:00 — {i<12?'AM':'PM'}</option>
              ))}
            </Select>
            <Btn onClick={refetch}>Generate →</Btn>
          </div>
        </Card>

        {isLoading && <LoadingBox />}
        {error && <ErrorBox />}

        {data && (
          <Grid cols={2} gap={16}>
            {/* Recommendation Card */}
            <Card style={{ borderLeft:`3px solid ${data.alert_level==='high'?'var(--red)':data.alert_level==='medium'?'var(--amber)':'var(--green)'}` }}>
              <CardTitle>Deployment Recommendation</CardTitle>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>STATION</div>
                <div style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>{data.station}</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <div style={{ padding:12, background:'var(--bg3)', borderRadius:8 }}>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>DEPLOY OFFICERS</div>
                  <div style={{ fontSize:28, fontWeight:700, color:'var(--text)' }}>{data.recommended_officers}</div>
                </div>
                <div style={{ padding:12, background:'var(--bg3)', borderRadius:8 }}>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>ALERT LEVEL</div>
                  <RiskBadge level={data.alert_level} />
                </div>
              </div>
              <div style={{ padding:12, background:'rgba(59,130,246,0.08)', borderRadius:8, borderLeft:'3px solid var(--accent)', marginBottom:16 }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>REASON</div>
                <div style={{ fontSize:13, color:'var(--text)' }}>{data.reasoning}</div>
              </div>
              <div style={{ display:'flex', gap:8, fontSize:12 }}>
                <span style={{ color:'var(--muted)' }}>Shift: {String(data.shift_hour).padStart(2,'0')}:00</span>
                <span style={{ color: data.is_peak?'var(--amber)':'var(--muted)' }}>{data.is_peak?'⚡ PEAK HOUR':'Off-peak'}</span>
                <span style={{ color:'var(--muted)' }}>Load: {data.station_load_ratio}× avg</span>
              </div>
            </Card>

            {/* Top Deployment Junctions */}
            <Card>
              <CardTitle>Top Deployment Junctions</CardTitle>
              {data.top_deployment_junctions?.map((j,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:18, fontWeight:700, color:'var(--muted)' }}>#{i+1}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--text)' }}>{j.junction_name?.replace('BTP','').replace(' - ',' ')}</div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{j.total_violations?.toLocaleString()} violations recorded</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:14, fontWeight:700, color: j.impact_score>=60?'var(--red)':'var(--amber)' }}>{j.impact_score}</div>
                    <div style={{ fontSize:10, color:'var(--muted)' }}>impact</div>
                  </div>
                </div>
              ))}
            </Card>
          </Grid>
        )}

        {/* Active Recommendations Queue */}
        <Card style={{ marginTop:16 }}>
          <CardTitle right={<span style={{fontSize:11,color:'var(--muted)'}}>{active?.length||0} active</span>}>Active Recommendations Queue</CardTitle>
          {!active?.length && <div style={{color:'var(--muted)',fontSize:13,textAlign:'center',padding:24}}>No active recommendations</div>}
          {active?.map(r => (
            <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:18 }}>{r.priority==='high'?'🔴':r.priority==='medium'?'🟡':'🟢'}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{r.station} — {r.location}</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{r.message}</div>
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>👮 {r.officers} officers · {new Date(r.created_at).toLocaleTimeString()}</div>
              </div>
              {['commander','dcp'].includes(officer?.role) && (
                <div style={{ display:'flex', gap:6 }}>
                  <Btn variant="success" onClick={()=>approve.mutate(r.id)}>✓ Approve</Btn>
                  <Btn variant="ghost" onClick={()=>dismiss.mutate(r.id)}>✕</Btn>
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
