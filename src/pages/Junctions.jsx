import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'
import { PageHeader, Card, CardTitle, Table, ScoreBar, LoadingBox, ErrorBox, Grid, StatCard } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const TT = { contentStyle:{ background:'#1a1d27', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, fontSize:12 } }

export default function Junctions() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['junctions-all'],
    queryFn: () => api.get('/impact/junctions?top_n=50').then(r => r.data),
  })

  if (isLoading) return <><PageHeader title="Junction Impact" /><LoadingBox h={400} /></>
  if (error) return <><PageHeader title="Junction Impact" /><div style={{padding:24}}><ErrorBox /></div></>

  const top10 = data.junctions.slice(0, 10)
  const critical = data.junctions.filter(j => j.impact_score >= 60)
  const high = data.junctions.filter(j => j.impact_score >= 40 && j.impact_score < 60)

  return (
    <div>
      <PageHeader title="Junction Impact Scores" subtitle="Congestion impact formula: Frequency(40%) + Peak Hour(30%) + Main Road(20%) + Spread(10%)" />
      <div style={{ padding:24 }}>
        <Grid cols={3} gap={14}>
          <StatCard label="Junctions Scored" value={data.junctions.length} color="var(--accent)" icon="📍" />
          <StatCard label="Critical (≥60)" value={critical.length} color="var(--red)" icon="🔴" sub="Immediate attention" />
          <StatCard label="High Priority (≥40)" value={high.length} color="var(--amber)" icon="🟡" sub="Monitor closely" />
        </Grid>

        <Grid cols={2} gap={16} style={{ marginTop:16 }}>
          <Card>
            <CardTitle>Top 10 by Impact Score</CardTitle>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={top10} layout="vertical" barSize={16}>
                <XAxis type="number" domain={[0,100]} tick={{fill:'#8892a4',fontSize:10}} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="junction_name" tick={{fill:'#8892a4',fontSize:9}} axisLine={false} tickLine={false} width={130}
                  tickFormatter={v=>v.replace('BTP','').replace(' - ',' ').slice(0,22)} />
                <Tooltip {...TT} formatter={v=>[`${v}/100`,'Impact Score']} />
                <Bar dataKey="impact_score" radius={[0,4,4,0]}>
                  {top10.map((j,i) => (
                    <Cell key={i} fill={j.impact_score>=60?'#ef4444':j.impact_score>=40?'#f59e0b':'#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardTitle>Score Breakdown Formula</CardTitle>
            <div style={{ padding:'8px 0' }}>
              {[
                { label:'Violation Frequency', weight:'40%', color:'var(--accent)', desc:'Total violations at junction' },
                { label:'Peak Hour Density', weight:'30%', color:'var(--amber)', desc:'% violations during 7–10 AM, 5–8 PM' },
                { label:'Main Road Presence', weight:'20%', color:'var(--green)', desc:'Violations on major arterials' },
                { label:'Temporal Spread', weight:'10%', color:'var(--teal)', desc:'Days of week with violations' },
              ].map(row => (
                <div key={row.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:3, height:36, background:row.color, borderRadius:2, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:'var(--text)', fontWeight:500 }}>{row.label}</div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{row.desc}</div>
                  </div>
                  <span style={{ fontSize:18, fontWeight:700, color:row.color }}>{row.weight}</span>
                </div>
              ))}
            </div>
          </Card>
        </Grid>

        <Card style={{ marginTop:16 }}>
          <CardTitle>All Junctions — Impact Ranking</CardTitle>
          <Table
            cols={[
              { key:'rank', label:'#', render:(_,i)=> i+1 },
              { key:'junction_name', label:'Junction', render: r => (
                <div>
                  <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{r.junction_name?.replace('BTP','').replace(' - ',' ')}</div>
                </div>
              )},
              { key:'impact_score', label:'Impact Score', render: r => (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:14, fontWeight:700, color: r.impact_score>=60?'var(--red)':r.impact_score>=40?'var(--amber)':'var(--green)' }}>
                    {r.impact_score}
                  </span>
                  <span style={{ fontSize:10, color:'var(--muted)' }}>/100</span>
                </div>
              )},
              { key:'total_violations', label:'Total', align:'right', render: r => r.total_violations?.toLocaleString() },
              { key:'peak_violations', label:'Peak Hr', align:'right', render: r => r.peak_violations?.toLocaleString() },
              { key:'main_road_violations', label:'Main Rd', align:'right', render: r => r.main_road_violations?.toLocaleString() },
              { key:'bar', label:'Visual', render: r => <ScoreBar score={Math.round(r.impact_score)} /> },
              { key:'action', label:'Priority', render: r => (
                <span style={{
                  fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:500,
                  background: r.impact_score>=60?'rgba(239,68,68,0.15)':r.impact_score>=40?'rgba(245,158,11,0.15)':'rgba(16,185,129,0.15)',
                  color: r.impact_score>=60?'var(--red)':r.impact_score>=40?'var(--amber)':'var(--green)',
                }}>
                  {r.impact_score>=60?'CRITICAL':r.impact_score>=40?'HIGH':'NORMAL'}
                </span>
              )},
            ]}
            rows={data.junctions}
            keyFn={r=>r.junction_name}
          />
        </Card>
      </div>
    </div>
  )
}
