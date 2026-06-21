import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../utils/api'
import { PageHeader, Card, CardTitle, Table, ScoreBar, LoadingBox, ErrorBox, Grid, StatCard, Input, Btn, RiskBadge } from '../components/UI'

export default function Offenders() {
  const [plate, setPlate] = useState('')
  const [lookupPlate, setLookupPlate] = useState(null)
  const [risk, setRisk] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['offenders', risk],
    queryFn: () => api.get(`/offenders/top?limit=50${risk?`&risk=${risk}`:''}`).then(r => r.data),
  })

  const { data: lookup, isLoading: lookupLoading } = useQuery({
    queryKey: ['offender-lookup', lookupPlate],
    queryFn: () => lookupPlate ? api.get(`/offenders/lookup?plate=${lookupPlate}`).then(r => r.data) : null,
    enabled: !!lookupPlate,
  })

  const doLookup = () => { if (plate.trim()) setLookupPlate(plate.trim().toUpperCase()) }

  const counts = data ? {
    total: data.total_in_registry,
    medium: data.offenders.filter(o=>o.risk_label==='medium').length,
    high: data.offenders.filter(o=>o.risk_label==='high').length,
  } : {}

  return (
    <div>
      <PageHeader title="Repeat Offender Intelligence" subtitle="Vehicle-level violation history and risk scoring" />
      <div style={{ padding:24 }}>
        <Grid cols={3} gap={14}>
          <StatCard label="Total in Registry" value={data?.total_in_registry?.toLocaleString()||'—'} color="var(--accent)" icon="🗃" />
          <StatCard label="High Risk (score>50)" value={data?.offenders?.filter(o=>o.risk_score>50).length||'—'} color="var(--red)" icon="🚨" sub="Escalate to RTO" />
          <StatCard label="Towing Priority" value={data?.offenders?.filter(o=>o.risk_score>40).length||'—'} color="var(--amber)" icon="🏗" />
        </Grid>

        {/* Vehicle Lookup */}
        <Card style={{ marginTop:16 }}>
          <CardTitle>Vehicle Number Lookup</CardTitle>
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            <div style={{ flex:1 }}><Input label="" placeholder="Enter vehicle number e.g. FKN00GL4424" value={plate} onChange={e=>setPlate(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLookup()} /></div>
            <div style={{ paddingTop:0 }}><Btn onClick={doLookup}>🔍 Lookup</Btn></div>
          </div>
          {lookupLoading && <div style={{color:'var(--muted)',fontSize:12}}>Searching...</div>}
          {lookup && (
            lookup.found ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, padding:16, background:'var(--bg3)', borderRadius:8 }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:3 }}>VEHICLE NUMBER</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>{lookup.vehicle_number}</div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:3 }}>RISK SCORE</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:22, fontWeight:700, color: lookup.risk_score>50?'var(--red)':lookup.risk_score>30?'var(--amber)':'var(--green)' }}>{lookup.risk_score}</span>
                    <RiskBadge level={lookup.risk_label} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:3 }}>TOTAL VIOLATIONS</div>
                  <div style={{ fontSize:16, fontWeight:600, color:'var(--text)' }}>{lookup.total_violations}</div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:3 }}>VIOLATION RATE</div>
                  <div style={{ fontSize:14, color:'var(--text)' }}>{lookup.violation_rate_per_day?.toFixed(3)}/day</div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:3 }}>ACTIVE SINCE</div>
                  <div style={{ fontSize:12, color:'var(--text)' }}>{new Date(lookup.first_seen).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:3 }}>LAST SEEN</div>
                  <div style={{ fontSize:12, color:'var(--text)' }}>{new Date(lookup.last_seen).toLocaleDateString()}</div>
                </div>
                <div style={{ gridColumn:'1/-1', display:'flex', gap:8, marginTop:4 }}>
                  {lookup.towing_priority && <span style={{ fontSize:11, padding:'4px 10px', background:'rgba(245,158,11,0.15)', color:'var(--amber)', borderRadius:4 }}>🏗 TOWING PRIORITY</span>}
                  {lookup.escalate_to_rto && <span style={{ fontSize:11, padding:'4px 10px', background:'rgba(239,68,68,0.15)', color:'var(--red)', borderRadius:4 }}>⚡ ESCALATE TO RTO</span>}
                </div>
              </div>
            ) : (
              <div style={{ color:'var(--green)', fontSize:13, padding:'8px 12px', background:'rgba(16,185,129,0.08)', borderRadius:6 }}>✅ Vehicle <strong>{lookup.vehicle_number}</strong> has no repeat offence history.</div>
            )
          )}
        </Card>

        {/* Filter + Table */}
        <Card style={{ marginTop:16 }}>
          <CardTitle right={
            <div style={{ display:'flex', gap:6 }}>
              {['','medium','high'].map(r=>(
                <button key={r||'all'} onClick={()=>setRisk(r)} style={{
                  padding:'4px 10px', borderRadius:5, fontSize:11, cursor:'pointer', border:'none',
                  background: risk===r?'var(--accent)':'var(--bg3)', color: risk===r?'#fff':'var(--muted)'
                }}>{r||'All'}</button>
              ))}
            </div>
          }>Top Repeat Offenders</CardTitle>
          {isLoading ? <LoadingBox /> : (
            <Table
              cols={[
                { key:'rank', label:'#', render:(_,i)=>i+1 },
                { key:'vehicle_number', label:'Vehicle Number', render: r=><code style={{fontSize:12,color:'var(--accent)'}}>{r.vehicle_number}</code> },
                { key:'total_violations', label:'Violations', align:'right' },
                { key:'risk_score', label:'Risk Score', render: r=>(
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <ScoreBar score={Math.round(r.risk_score)} />
                    <span style={{fontSize:11,fontWeight:600,color:r.risk_score>50?'var(--red)':r.risk_score>30?'var(--amber)':'var(--green)'}}>{r.risk_score}</span>
                  </div>
                )},
                { key:'risk_label', label:'Risk', render: r=><RiskBadge level={r.risk_label} /> },
                { key:'violation_rate', label:'Rate/Day', align:'right', render: r=>(r.violation_rate*1).toFixed(3) },
                { key:'last_seen', label:'Last Seen', render: r=>new Date(r.last_seen).toLocaleDateString() },
                { key:'action', label:'Action', render: r=>(
                  r.risk_score>40 ? <span style={{fontSize:10,color:'var(--red)'}}>🏗 TOW</span> : '—'
                )},
              ]}
              rows={data?.offenders||[]}
              keyFn={r=>r.vehicle_number}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
