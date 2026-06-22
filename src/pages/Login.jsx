import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/api'

export default function Login() {
  const [badge, setBadge] = useState('')
  const [pass, setPass] = useState('')
  const { login, loading, error } = useAuth()
  const nav = useNavigate()

  const handle = async (e) => {
    e.preventDefault()
    const ok = await login(badge, pass)
    if (ok) nav('/')
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={logoStyle}>🚓</div>

          <h1 style={titleStyle}>ParkingIQ</h1>

          <p style={subtitleStyle}>
            Bengaluru Traffic Police Intelligence Platform
          </p>
        </div>

        <form onSubmit={handle}>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Badge ID</label>
            <input
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="BTP001"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={btnStyle}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={demoStyle}>
          <h4 style={{ marginBottom: 10 }}>Demo Credentials</h4>

          <div>BTP001 / password123 (DCP)</div>
          <div>BTP002 / password123 (Commander)</div>
          <div>BTP004 / password123 (Officer)</div>
        </div>
      </div>
    </div>
  )
}

const pageStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  background:
    'linear-gradient(135deg, #0f172a 0%, #111827 50%, #1e293b 100%)'
}

const cardStyle = {
  width: '100%',
  maxWidth: '420px',
  padding: '36px',
  borderRadius: '24px',
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 20px 50px rgba(0,0,0,0.35)'
}

const logoStyle = {
  width: '70px',
  height: '70px',
  margin: '0 auto 16px',
  borderRadius: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '32px',
  background: 'rgba(255,255,255,0.08)'
}

const titleStyle = {
  color: '#fff',
  fontSize: '30px',
  marginBottom: '6px'
}

const subtitleStyle = {
  color: '#94a3b8',
  fontSize: '14px'
}

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  color: '#cbd5e1',
  fontSize: '13px',
  fontWeight: '500'
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  fontSize: '14px',
  outline: 'none'
}

const btnStyle = {
  width: '100%',
  padding: '13px',
  border: 'none',
  borderRadius: '12px',
  fontSize: '15px',
  fontWeight: '600',
  cursor: 'pointer',
  color: '#fff',
  background:
    'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
}

const errorStyle = {
  marginBottom: '14px',
  padding: '10px',
  borderRadius: '10px',
  background: 'rgba(239,68,68,0.12)',
  color: '#f87171',
  fontSize: '13px'
}

const demoStyle = {
  marginTop: '24px',
  padding: '14px',
  borderRadius: '12px',
  background: 'rgba(255,255,255,0.04)',
  color: '#94a3b8',
  fontSize: '13px',
  lineHeight: '1.8'
}