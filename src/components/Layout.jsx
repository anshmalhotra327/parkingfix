import { Outlet, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth, api } from '../utils/api'

const NAV = [
  { to:'/',           icon:'📊', label:'Dashboard' },
  { to:'/heatmap',    icon:'🗺',  label:'Heatmap' },
  { to:'/junctions',  icon:'🔴', label:'Junctions' },
  { to:'/patrol',     icon:'🚔', label:'Patrol' },
  { to:'/violations', icon:'📋', label:'Violations' },
  { to:'/offenders',  icon:'⚠️', label:'Offenders' },
  { to:'/metro',      icon:'🚇', label:'Metro Zones' },
  { to:'/predict',    icon:'🧠', label:'Predict' },
  { to:'/alerts',     icon:'🔔', label:'Alerts' },
]

export default function Layout() {
  const { officer, logout } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    api.get('/alerts/unread').then(r => setUnread(r.data.length)).catch(() => {})
    // Poll for unread alerts every 30s (no WebSocket on Vercel)
    const t = setInterval(() => {
      api.get('/alerts/unread').then(r => setUnread(r.data.length)).catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <aside style={{
        width:200, background:'var(--bg2)', borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column', flexShrink:0,
      }}>
        <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--accent)' }}>🚔 ParkingIQ</div>
          <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>Bengaluru Traffic Police</div>
        </div>
        <nav style={{ flex:1, overflowY:'auto', padding:'8px' }}>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:9, padding:'8px 10px',
                borderRadius:7, marginBottom:2, textDecoration:'none', fontSize:13,
                color: isActive ? '#fff' : 'var(--muted)',
                background: isActive ? 'var(--accent)' : 'transparent',
                position:'relative',
              })}>
              <span style={{ fontSize:14 }}>{n.icon}</span>
              {n.label}
              {n.to === '/alerts' && unread > 0 && (
                <span style={{ marginLeft:'auto', background:'var(--red)', color:'#fff', fontSize:10, padding:'1px 5px', borderRadius:10 }}>{unread}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding:'12px', borderTop:'1px solid var(--border)' }}>
          <div style={{ fontSize:12, color:'var(--text)', fontWeight:500 }}>{officer?.name}</div>
          <div style={{ fontSize:11, color:'var(--muted)' }}>{officer?.station} · {officer?.role}</div>
          <button onClick={logout} style={{
            marginTop:8, width:'100%', padding:'6px', background:'transparent',
            border:'1px solid var(--border)', borderRadius:6, color:'var(--muted)',
            fontSize:12, cursor:'pointer',
          }}>Sign out</button>
        </div>
      </aside>
      <main style={{ flex:1, overflowY:'auto', background:'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  )
}
