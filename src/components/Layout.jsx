import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth, api } from '../utils/api'
import {
  FaChartBar,
  FaMapMarkedAlt,
  FaRoad,
  FaCar,
  FaClipboardList,
  FaExclamationTriangle,
  FaSubway,
  FaBrain,
  FaBell,
  FaRadiation,
  FaProjectDiagram
} from "react-icons/fa";

const NAV = [
  { to:'/', icon:<FaChartBar />, label:'Dashboard' },
  { to:'/heatmap', icon:<FaMapMarkedAlt />, label:'Heatmap' },
  { to:'/junctions', icon:<FaRoad />, label:'Junction Analysis' },
  { to:'/patrol', icon:<FaCar />, label:'Patrol Management' },
  { to:'/violations', icon:<FaClipboardList />, label:'Violation Records' },
  { to:'/offenders', icon:<FaExclamationTriangle />, label:'Repeat Offenders' },
  { to:'/metro', icon:<FaSubway />, label:'Metro Zones' },
  { to:'/predict', icon:<FaBrain />, label:'Predictive Analytics' },
  { to:'/alerts',     icon:<FaBell />,          label:'Alerts' },
  { to:'/recidivism', icon:<FaRadiation />,     label:'Recidivism Risk' },
  { to:'/cascade',    icon:<FaProjectDiagram />, label:'Cascade Map' },
];

export default function Layout() {
  const { officer, logout } = useAuth()
  const [unread, setUnread] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // --- FORCE REMOVE POLICE CAR FAVICON ---
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) {
      link.remove();
    }
  }, []);
  // ----------------------------------------

  useEffect(() => {
    api.get('/alerts/unread').then(r => setUnread(r.data.length)).catch(() => {})
    // Poll for unread alerts every 30s (no WebSocket on Vercel)
    const t = setInterval(() => {
      api.get('/alerts/unread').then(r => setUnread(r.data.length)).catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [])

  // Auto-close the mobile drawer whenever the route changes
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
      {/* Mobile-only top bar with hamburger toggle (hidden on desktop via CSS) */}
      <div className="iq-topbar">
        <button className="iq-hamburger-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <span /><span /><span />
        </button>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--accent)' }}>ParkingIQ</div>
        {unread > 0 && (
          <span style={{ marginLeft:'auto', background:'var(--red)', color:'#fff', fontSize:10, padding:'2px 6px', borderRadius:10 }}>{unread}</span>
        )}
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden', position:'relative' }}>
        {/* Backdrop, mobile only, shown when drawer is open */}
        {menuOpen && <div className="iq-overlay" onClick={() => setMenuOpen(false)} />}

        <aside className={`iq-sidebar${menuOpen ? ' open' : ''}`} style={{
          width:200, background:'var(--bg2)', borderRight:'1px solid var(--border)',
          display:'flex', flexDirection:'column', flexShrink:0,
        }}>
          <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--accent)' }}>ParkingIQ</div>
              <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>Traffic Intelligence Platform</div>
            </div>
            <button className="iq-close-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu">✕</button>
          </div>
          <nav style={{ flex:1, overflowY:'auto', padding:'8px' }}>
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              style={({ isActive }) => ({
                display:'flex',
                alignItems:'center',
                gap:9,
                padding:'10px 12px',
                borderRadius:10,
                marginBottom:4,
                textDecoration:'none',
                fontSize:13,
                fontWeight:500,
                color: isActive ? '#fff' : 'var(--muted)',
                background: isActive ? 'var(--accent)' : 'transparent',
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                position:'relative',
              })}
            >
              <span style={{ fontSize:16, display:'flex', alignItems:'center' }}>
                {n.icon}
              </span>
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
        <main style={{ flex:1, overflowY:'auto', overflowX:'hidden', minWidth:0, background:'var(--bg)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}