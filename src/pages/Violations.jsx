import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../utils/api'
import { useAuth } from '../utils/api'
import { PageHeader, Card, CardTitle, Table, LoadingBox, Input, Select, Btn, Grid, StatCard } from '../components/UI'

const VEHICLE_TYPES = ['CAR','SCOOTER','MOTORCYCLE','PASSENGER AUTO','MAXI-CAB','LGV','BUS','TRUCK']
const VIOLATION_TYPES = ['WRONG PARKING','NO PARKING','PARKING IN A MAIN ROAD','PARKING NEAR ROAD CROSSING','DEFECTIVE NUMBER PLATE']

export default function Violations() {
  const { officer } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ vehicle_number:'', vehicle_type:'CAR', violation_type:'WRONG PARKING', location:'', notes:'' })
  const [msg, setMsg] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['violations'],
    queryFn: () => api.get('/violations?limit=50').then(r => r.data),
    refetchInterval: 20000,
  })

  const file = useMutation({
    mutationFn: body => api.post('/violations', body),
    onSuccess: () => {
      qc.invalidateQueries(['violations'])
      setMsg({ ok:true, text:'Violation filed successfully!' })
      setForm({ vehicle_number:'', vehicle_type:'CAR', violation_type:'WRONG PARKING', location:'', notes:'' })
      setTimeout(()=>setMsg(null), 3000)
    },
    onError: e => setMsg({ ok:false, text: e.response?.data?.error || 'Failed' })
  })

  const validate = useMutation({
    mutationFn: ({id, status}) => api.patch(`/violations/status?id=${id}&status=${status}`),
    onSuccess: () => qc.invalidateQueries(['violations'])
  })

  const submit = () => {
    if (!form.vehicle_number.trim()) return setMsg({ok:false,text:'Vehicle number required'})
    file.mutate(form)
  }

  return (
    <div>
      <PageHeader title="Violations" subtitle="File new violations and manage existing records"
        right={<Btn onClick={()=>setShowForm(v=>!v)}>+ File Violation</Btn>} />
      <div style={{ padding:24 }}>

        {/* File form */}
        {showForm && (
          <Card style={{ marginBottom:16, borderLeft:'3px solid var(--accent)' }}>
            <CardTitle>File New Violation</CardTitle>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Input label="Vehicle Number *" value={form.vehicle_number} onChange={e=>setForm(f=>({...f,vehicle_number:e.target.value.toUpperCase()}))} placeholder="KA01AB1234" />
              <Select label="Vehicle Type" value={form.vehicle_type} onChange={e=>setForm(f=>({...f,vehicle_type:e.target.value}))}>
                {VEHICLE_TYPES.map(t=><option key={t}>{t}</option>)}
              </Select>
              <Select label="Violation Type" value={form.violation_type} onChange={e=>setForm(f=>({...f,violation_type:e.target.value}))}>
                {VIOLATION_TYPES.map(t=><option key={t}>{t}</option>)}
              </Select>
              <Input label="Location" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="Street / area description" />
              <div style={{ gridColumn:'1/-1' }}>
                <Input label="Notes" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Additional notes (optional)" />
              </div>
            </div>
            {msg && <div style={{ marginTop:10, fontSize:12, color: msg.ok?'var(--green)':'var(--red)', padding:'6px 10px', background: msg.ok?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', borderRadius:5 }}>{msg.text}</div>}
            <div style={{ marginTop:14, display:'flex', gap:8 }}>
              <Btn onClick={submit} disabled={file.isPending}>{file.isPending?'Submitting…':'Submit Violation'}</Btn>
              <Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancel</Btn>
            </div>
          </Card>
        )}

        {/* Stats */}
        <Grid cols={3} gap={12} style={{ marginBottom:16 }}>
          <StatCard label="Total Filed (Live DB)" value={data?.total?.toLocaleString()||'—'} color="var(--accent)" />
          <StatCard label="Your Station" value={officer?.station} color="var(--teal)" />
          <StatCard label="Pending Validation" value={data?.violations?.filter(v=>v.status==='pending').length||0} color="var(--amber)" />
        </Grid>

        {/* Table */}
        <Card>
          <CardTitle right={<span style={{fontSize:11,color:'var(--muted)'}}>Last 50 violations</span>}>Recent Violations</CardTitle>
          {isLoading ? <LoadingBox /> : (
            <Table
              cols={[
                { key:'id', label:'ID', render: r=><code style={{fontSize:11,color:'var(--muted)'}}>{r.id?.slice(0,10)}</code> },
                { key:'vehicle_number', label:'Vehicle', render: r=><strong style={{color:'var(--accent)',fontSize:12}}>{r.vehicle_number}</strong> },
                { key:'vehicle_type', label:'Type', render: r=><span style={{fontSize:11}}>{r.vehicle_type}</span> },
                { key:'violation_type', label:'Violation', render: r=><span style={{fontSize:11}}>{r.violation_type}</span> },
                { key:'police_station', label:'Station' },
                { key:'status', label:'Status', render: r=>(
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4,
                    background: r.status==='validated'?'rgba(16,185,129,0.15)':r.status==='rejected'?'rgba(239,68,68,0.15)':'rgba(245,158,11,0.15)',
                    color: r.status==='validated'?'var(--green)':r.status==='rejected'?'var(--red)':'var(--amber)',
                  }}>{r.status||'pending'}</span>
                )},
                { key:'created_at', label:'Filed At', render: r=>new Date(r.created_at).toLocaleString() },
                { key:'actions', label:'', render: r=>(
                  ['commander','dcp'].includes(officer?.role) && r.status==='pending' ? (
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>validate.mutate({id:r.id,status:'validated'})} style={{fontSize:10,padding:'2px 7px',borderRadius:4,border:'none',background:'rgba(16,185,129,0.2)',color:'var(--green)',cursor:'pointer'}}>✓</button>
                      <button onClick={()=>validate.mutate({id:r.id,status:'rejected'})} style={{fontSize:10,padding:'2px 7px',borderRadius:4,border:'none',background:'rgba(239,68,68,0.2)',color:'var(--red)',cursor:'pointer'}}>✕</button>
                    </div>
                  ) : null
                )},
              ]}
              rows={data?.violations||[]}
              keyFn={r=>r.id}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
