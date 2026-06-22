import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/api'
import './Login.css'

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
    <div className="login-page">
      <div className="glow glow-1"></div>
      <div className="glow glow-2"></div>

      <div className="login-card">
        <div className="login-header">
          <div className="logo-box">
            <span>PIQ</span>
          </div>

          <h1>Parking-IQ</h1>

          <p>
            Bengaluru Traffic Police Intelligence Platform
          </p>
        </div>

        <form onSubmit={handle}>
          <div className="input-group">
            <label>Badge ID</label>
            <input
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="BTP001"
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-btn"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-box">
          <h4>Demo Credentials</h4>

          <div>BTP001 / password123 (DCP)</div>
          <div>BTP002 / password123 (Commander)</div>
          <div>BTP004 / password123 (Officer)</div>
        </div>
      </div>
    </div>
  )
}