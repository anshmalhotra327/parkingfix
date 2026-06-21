import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/api'

export default function Login() {
  const [badge, setBadge] = useState('')
  const [pass, setPass]   = useState('')
  const { login, loading, error } = useAuth()
  const nav = useNavigate()

  const handle = async e => {
    e.preventDefault()
    const ok = await login(badge, pass)
    if (ok) nav('/')
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ width:360, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:32 }}>
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <span style={{ fontSize:22 }}>🚔</span>
            <span style={{ fontSize:18, fontWeight:600, color:'var(--text)' }}>Parking Intelligence</span>
          </div>
          <p style={{ color:'var(--muted)', fontSize:13 }}>Bengaluru Traffic Police — Command System</p>
        </div>

        <form onSubmit={handle}>
          <label style={{ display:'block', marginBottom:16 }}>
            <span style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6 }}>Badge ID</span>
            <input
              value={badge} onChange={e => setBadge(e.target.value)}
              placeholder="BTP001"
              style={inputStyle}
            />
          </label>
          <label style={{ display:'block', marginBottom:20 }}>
            <span style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6 }}>Password</span>
            <input
              type="password" value={pass} onChange={e => setPass(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </label>
          {error && <p style={{ color:'var(--red)', fontSize:12, marginBottom:12 }}>{error}</p>}
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop:20, padding:12, background:'var(--bg3)', borderRadius:8, fontSize:12, color:'var(--muted)' }}>
          <strong style={{ color:'var(--text)' }}>Demo credentials:</strong><br/>
          DCP: BTP001 / password123<br/>
          Commander: BTP002 / password123<br/>
          Officer: BTP004 / password123
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width:'100%', padding:'9px 12px', background:'var(--bg3)',
  border:'1px solid var(--border)', borderRadius:8, color:'var(--text)',
  fontSize:14, outline:'none'
}
const btnStyle = {
  width:'100%', padding:'10px', background:'var(--accent)',
  border:'none', borderRadius:8, color:'#fff', fontSize:14,
  fontWeight:500, cursor:'pointer'
}
