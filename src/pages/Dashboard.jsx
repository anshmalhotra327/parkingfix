import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'
import { StatCard, Card, CardTitle, LoadingBox, ErrorBox, Grid, Table, ScoreBar, RiskBadge, PageHeader } from '../components/UI'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f97316','#ec4899']
const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const TT = { contentStyle:{ background:'#1a1d27', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, fontSize:12 }, labelStyle:{ color:'#8892a4' } }

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey:['overview'], queryFn: () => api.get('/analytics/overview').then(r=>r.data), refetchInterval:60000 })
  const { data: recs } = useQuery({ queryKey:['recs'], queryFn: () => api.get('/patrol/active').then(r=>r.data), refetchInterval:30000 })

  if (isLoading) return <><PageHeader title="Dashboard" subtitle="Command Center Overview" /><LoadingBox h={400} /></>
  if (error) return <><PageHeader title="Dashboard" /><div style={{padding:24}}><ErrorBox /></div></>

  const s = data.summary
  const monthly = data.monthly_pattern?.map(r => ({ ...r, name: MONTHS[r.month] || r.month }))
  const hourly  = data.hourly_pattern?.slice(0,24)
  const vtypes  = data.vehicle_types?.slice(0,6)
  const viol    = data.violation_types?.slice(0,6).map(([name,val])=>({ name: name.replace('PARKING IN A ','').replace('DEFECTIVE ','DEF. '), val }))

  return (
    <div>
      <PageHeader title="Command Center" subtitle="Bengaluru Parking Intelligence — Live Overview"
        right={<span style={{ fontSize:11, color:'var(--muted)' }}>🟢 Live • Auto-refresh 60s</span>} />
      <div style={{ padding:24 }}>

        {/* KPI Row */}
        <Grid cols={4} gap={14}>
          <StatCard label="Total Violations" value={s.total_violations?.toLocaleString()} sub="Nov 2023 – Apr 2024" color="var(--accent)" icon="📋" />
          <StatCard label="Police Stations" value={s.total_stations} sub="Active enforcement zones" color="var(--green)" icon="🏢" />
          <StatCard label="Junctions Scored" value={s.total_junctions} sub="Impact scored locations" color="var(--amber)" icon="🔴" />
          <StatCard label="Repeat Offenders" value={s.repeat_offenders_flagged} sub="Risk score > 40" color="var(--red)" icon="⚠️" />
        </Grid>

        {/* Charts row 1 */}
        <Grid cols={2} gap={16} style={{ marginTop:16 }}>
          <Card>
            <CardTitle>Monthly Violation Trend</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthly}>
                <XAxis dataKey="name" tick={{ fill:'#8892a4', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#8892a4', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`} />
                <Tooltip {...TT} formatter={v=>[v.toLocaleString(),'Violations']} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r:3, fill:'#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardTitle>Violations by Hour</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourly} barSize={10}>
                <XAxis dataKey="hour" tick={{ fill:'#8892a4', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#8892a4', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`} />
                <Tooltip {...TT} formatter={v=>[v.toLocaleString(),'Violations']} />
                <Bar dataKey="count" fill="#6366f1" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Charts row 2 */}
        <Grid cols={2} gap={16} style={{ marginTop:16 }}>
          <Card>
            <CardTitle>Vehicle Type Breakdown</CardTitle>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={vtypes} dataKey="count" nameKey="vehicle_type" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                    {vtypes?.map((_,i)=><Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip {...TT} formatter={v=>[v.toLocaleString()]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {vtypes?.map((v,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:COLORS[i] }} />
                      <span style={{ fontSize:11, color:'var(--muted)' }}>{v.vehicle_type}</span>
                    </div>
                    <span style={{ fontSize:11, color:'var(--text)', fontWeight:500 }}>{v.count?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <CardTitle>Top Violation Types</CardTitle>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={viol} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fill:'#8892a4', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fill:'#8892a4', fontSize:10 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip {...TT} formatter={v=>[v.toLocaleString()]} />
                <Bar dataKey="val" fill="#10b981" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Top Stations */}
        <Card style={{ marginTop:16 }}>
          <CardTitle>Top Police Stations by Violations</CardTitle>
          <Table
            cols={[
              { key:'police_station', label:'Station' },
              { key:'total', label:'Total', align:'right', render: r => r.total?.toLocaleString() },
              { key:'peak_pct', label:'Peak %', align:'right', render: r => `${r.peak_pct}%` },
              { key:'metro_zone', label:'Metro Zone', align:'right', render: r => r.metro_zone?.toLocaleString() },
              { key:'unique_vehicles', label:'Unique Vehicles', align:'right', render: r => r.unique_vehicles?.toLocaleString() },
              { key:'bar', label:'Load', render: r => <ScoreBar score={Math.min(100, Math.round(r.total/3500))} /> },
            ]}
            rows={data.top_stations || []}
            keyFn={r=>r.police_station}
          />
        </Card>

        {/* Active Recommendations */}
        {recs?.length > 0 && (
          <Card style={{ marginTop:16 }}>
            <CardTitle>Active Patrol Recommendations</CardTitle>
            {recs.slice(0,5).map(r => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:18 }}>{r.priority==='high'?'🔴':r.priority==='medium'?'🟡':'🟢'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{r.location}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{r.message}</div>
                </div>
                <span style={{ fontSize:11, color:'var(--muted)' }}>👮 {r.officers} officers</span>
                <RiskBadge level={r.priority} />
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
