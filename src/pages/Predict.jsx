import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../utils/api'
import { PageHeader, Card, CardTitle, Input, Select, Btn, Grid, StatCard, ScoreBar, RiskBadge } from '../components/UI'

const VEHICLE_TYPES = ['CAR','SCOOTER','MOTORCYCLE','PASSENGER AUTO','MAXI-CAB','LGV']
// Key Bengaluru locations
const PRESETS = [
  { label:'KR Market',         lat:12.9679, lng:77.5759 },
  { label:'Safina Plaza',      lat:12.9825, lng:77.5982 },
  { label:'Elite Junction',    lat:12.9974, lng:77.5943 },
  { label:'Majestic Metro',    lat:12.9767, lng:77.5713 },
  { label:'MG Road',           lat:12.9756, lng:77.6099 },
  { label:'Indiranagar',       lat:12.9784, lng:77.6408 },
  { label:'Koramangala',       lat:12.9352, lng:77.6245 },
  { label:'Whitefield',        lat:12.9698, lng:77.7499 },
]

export default function Predict() {
  const [form, setForm] = useState({
    lat: 12.9679, lng: 77.5759,
    hour: new Date().getHours(),
    day_of_week: new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
    month: new Date().getMonth() + 1,
    vehicle_type: 'CAR',
  })
  const [result, setResult] = useState(null)

  const predict = useMutation({
    mutationFn: body => api.post('/predict/hotspot', body).then(r => r.data),
    onSuccess: data => setResult(data),
  })

  const applyPreset = p => setForm(f => ({ ...f, lat: p.lat, lng: p.lng }))

  const probColor = p => p > 0.7 ? 'var(--red)' : p > 0.45 ? 'var(--amber)' : 'var(--green)'

  return (
    <div>
      <PageHeader title="Hotspot Predictor" subtitle="AI model predicts violation probability for any location and time" />
      <div style={{ padding:24 }}>
        <Grid cols={2} gap={16}>
          <div>
            <Card>
              <CardTitle>Prediction Input</CardTitle>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:0.4 }}>Quick Presets</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {PRESETS.map(p=>(
                    <button key={p.label} onClick={()=>applyPreset(p)} style={{
                      padding:'4px 10px', borderRadius:5, fontSize:11, cursor:'pointer',
                      border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--muted)'
                    }}>{p.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <Input label="Latitude" type="number" step="0.0001" value={form.lat} onChange={e=>setForm(f=>({...f,lat:+e.target.value}))} />
                <Input label="Longitude" type="number" step="0.0001" value={form.lng} onChange={e=>setForm(f=>({...f,lng:+e.target.value}))} />
                <Select label="Hour of Day" value={form.hour} onChange={e=>setForm(f=>({...f,hour:+e.target.value}))}>
                  {Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,'0')}:00</option>)}
                </Select>
                <Select label="Day of Week" value={form.day_of_week} onChange={e=>setForm(f=>({...f,day_of_week:+e.target.value}))}>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d,i)=><option key={i} value={i}>{d}</option>)}
                </Select>
                <Select label="Month" value={form.month} onChange={e=>setForm(f=>({...f,month:+e.target.value}))}>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=><option key={i} value={i+1}>{m}</option>)}
                </Select>
                <Select label="Vehicle Type" value={form.vehicle_type} onChange={e=>setForm(f=>({...f,vehicle_type:e.target.value}))}>
                  {VEHICLE_TYPES.map(t=><option key={t}>{t}</option>)}
                </Select>
              </div>

              <Btn onClick={()=>predict.mutate(form)} disabled={predict.isPending}>
                {predict.isPending ? '🧠 Predicting…' : '🧠 Predict Hotspot'}
              </Btn>
            </Card>

            <Card style={{ marginTop:16 }}>
              <CardTitle>How the Model Works</CardTitle>
              <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.7 }}>
                <p>Trained on <strong style={{color:'var(--text)'}}>298,282 Bengaluru violations</strong> (Nov 2023–Apr 2024) using a Gradient Boosted Trees classifier.</p>
                <br/>
                <p><strong style={{color:'var(--text)'}}>Features used:</strong></p>
                <ul style={{ paddingLeft:16, marginTop:4 }}>
                  {['Hour of day','Day of week','Month','Peak hour flag','Weekend flag','Metro zone (300m)','Main road flag','Grid cell identity','Vehicle type'].map(f=>(
                    <li key={f} style={{ fontSize:11 }}>{f}</li>
                  ))}
                </ul>
                <br/>
                <p><strong style={{color:'var(--green)'}}>Model accuracy: 89.1%</strong></p>
                <p style={{ marginTop:4 }}>Threshold: 75th percentile violation density defines a "hotspot" cell.</p>
              </div>
            </Card>
          </div>

          <div>
            {result ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {/* Main result */}
                <Card style={{ borderLeft:`4px solid ${probColor(result.probability)}` }}>
                  <CardTitle>Prediction Result</CardTitle>
                  <div style={{ textAlign:'center', padding:'16px 0' }}>
                    <div style={{ fontSize:56, fontWeight:700, color:probColor(result.probability), lineHeight:1 }}>
                      {(result.probability * 100).toFixed(0)}%
                    </div>
                    <div style={{ fontSize:13, color:'var(--muted)', marginTop:6 }}>Hotspot Probability</div>
                    <div style={{ marginTop:12, display:'flex', justifyContent:'center' }}>
                      <RiskBadge level={result.risk_level} />
                    </div>
                  </div>
                </Card>

                {/* Recommendation */}
                <Card>
                  <CardTitle>Enforcement Recommendation</CardTitle>
                  <div style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 0' }}>
                    <span style={{ fontSize:32 }}>👮</span>
                    <div>
                      <div style={{ fontSize:22, fontWeight:700, color:'var(--text)' }}>{result.recommendation?.deploy_officers} Officers</div>
                      <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Recommended deployment</div>
                    </div>
                  </div>
                  <div style={{ padding:'10px 12px', background:'rgba(59,130,246,0.08)', borderRadius:7, borderLeft:'3px solid var(--accent)' }}>
                    <div style={{ fontSize:12, color:'var(--text)' }}>{result.recommendation?.reason}</div>
                  </div>
                </Card>

                {/* Context */}
                <Card>
                  <CardTitle>Location Context</CardTitle>
                  <div style={{ fontSize:12, color:'var(--muted)', lineHeight:2 }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span>Metro Zone:</span>
                      <span style={{ color: result.is_metro_zone?'var(--amber)':'var(--muted)' }}>
                        {result.is_metro_zone ? `✓ Yes (${result.nearest_metro?.[0]})` : '✗ No'}
                      </span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span>Nearest Metro:</span>
                      <span style={{ color:'var(--text)' }}>{result.nearest_metro?.[0]} ({result.nearest_metro?.[1]}m)</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span>Peak Hour:</span>
                      <span style={{ color: result.features_used?.is_peak?'var(--amber)':'var(--muted)' }}>
                        {result.features_used?.is_peak ? '⚡ Yes' : 'No'}
                      </span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span>Weekend:</span>
                      <span style={{ color:'var(--text)' }}>{result.features_used?.is_weekend ? 'Yes' : 'No'}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span>Coordinates:</span>
                      <span style={{ color:'var(--text)', fontFamily:'monospace', fontSize:11 }}>{form.lat}, {form.lng}</span>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <Card style={{ height:400, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
                <span style={{ fontSize:48, opacity:0.3 }}>🧠</span>
                <div style={{ fontSize:13, color:'var(--muted)', textAlign:'center' }}>
                  Configure a location and time,<br/>then click Predict to run the AI model
                </div>
              </Card>
            )}
          </div>
        </Grid>
      </div>
    </div>
  )
}
