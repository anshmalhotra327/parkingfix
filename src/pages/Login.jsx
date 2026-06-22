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
      {/* ── LEFT: Visual / Branding Panel ── */}
      <div className="login-visual-panel">
        <div className="login-visual-overlay" />
        <img
          className="login-hero-img"
          src="/bengaluru_hero.png"
          alt="Bengaluru city traffic grid"
        />
        <div className="login-brand-content">
          <div className="login-brand-logo">
            <span>PIQ</span>
          </div>
          <h2 className="login-brand-title">Bengaluru Traffic Police<br />Intelligence Platform</h2>
          <p className="login-brand-sub">
            Real-time parking enforcement powered by data-driven intelligence.
          </p>
        </div>
        <div className="login-visual-dots" />
      </div>

      {/* ── RIGHT: Form Panel ── */}
      <div className="login-form-panel">
        <div className="login-form-inner">
          {/* Header */}
          <div className="login-form-header">
            <div className="logo-box">
              <span>PIQ</span>
            </div>
            <h1 className="login-form-title">Parking-IQ</h1>
            <p className="login-form-subtitle">Sign in to your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handle} className="login-form">
            <div className="input-group">
              <label htmlFor="badge-id">Badge ID</label>
              <input
                id="badge-id"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. BTP001"
                autoComplete="username"
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="login-btn"
            >
              {loading ? (
                <span className="login-btn-loading">
                  <span className="spinner" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="demo-box">
            <h4>Demo Credentials</h4>
            <div className="demo-row"><span className="demo-badge">DCP</span><span>BTP001 / password123</span></div>
            <div className="demo-row"><span className="demo-badge">CMD</span><span>BTP002 / password123</span></div>
            <div className="demo-row"><span className="demo-badge">OFC</span><span>BTP004 / password123</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}