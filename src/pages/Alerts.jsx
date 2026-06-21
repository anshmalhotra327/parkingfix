import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../utils/api'
import { PageHeader, Card, CardTitle, LoadingBox, Btn, Grid, StatCard } from '../components/UI'

const ICON = { hotspot:'🔥', repeat_offender:'⚠️', metro_surge:'🚇', system:'⚙️' }
const SEV  = { high:'var(--red)', medium:'var(--amber)', low:'var(--green)' }

export default function Alerts() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get('/alerts').then(r => r.data),
    refetchInterval: 15000,
  })

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/alerts/read?id=${id}`),
    onSuccess: () => qc.invalidateQueries(['alerts'])
  })
  const markAll = useMutation({
    mutationFn: () => api.patch('/alerts/read?id=all'),
    onSuccess: () => qc.invalidateQueries(['alerts'])
  })

  const alerts = Array.isArray(data) ? data : []
  const unread = alerts.filter(a=>!a.is_read).length

  return (
    <div>
      <PageHeader title="Alerts" subtitle="System alerts, hotspot notifications, repeat offender flags"
        right={unread > 0 && <Btn variant="ghost" onClick={()=>markAll.mutate()}>Mark all read ({unread})</Btn>} />
      <div style={{ padding:24 }}>
        <Grid cols={3} gap={14} style={{ marginBottom:16 }}>
          <StatCard label="Total Alerts" value={alerts.length} color="var(--accent)" />
          <StatCard label="Unread" value={unread} color="var(--red)" icon="🔴" />
          <StatCard label="High Severity" value={alerts.filter(a=>a.severity==='high').length} color="var(--amber)" />
        </Grid>

        {isLoading && <LoadingBox />}
        {!isLoading && alerts.length === 0 && (
          <Card><div style={{ textAlign:'center', padding:40, color:'var(--muted)', fontSize:13 }}>✅ No alerts. System is running normally.</div></Card>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {alerts.map(a => (
            <div key={a.id} onClick={()=>!a.is_read&&markRead.mutate(a.id)} style={{
              padding:'14px 16px', background:'var(--bg2)',
              border:`1px solid ${a.is_read?'var(--border)':SEV[a.severity]||'var(--border)'}`,
              borderLeft:`4px solid ${SEV[a.severity]||'var(--border)'}`,
              borderRadius:8, cursor: a.is_read?'default':'pointer',
              opacity: a.is_read ? 0.6 : 1, transition:'opacity 0.2s'
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{ICON[a.type]||'📢'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{a.title}</span>
                    {!a.is_read && <span style={{ fontSize:9, background:'var(--red)', color:'#fff', padding:'1px 5px', borderRadius:3, fontWeight:600 }}>NEW</span>}
                  </div>
                  {a.body && <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>{a.body}</div>}
                  <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--muted)' }}>
                    <span>{a.station || 'City-wide'}</span>
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                    <span style={{ color:SEV[a.severity], textTransform:'uppercase', fontWeight:500 }}>{a.severity}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
