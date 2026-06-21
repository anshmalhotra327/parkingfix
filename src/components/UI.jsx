import { useState } from 'react'

// ── Page Header ───────────────────────────────────────────────
export function PageHeader({ title, subtitle, right }) {
  return (
    <div style={{
      padding: '20px 24px 16px',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10
    }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 12, color: 'var(--muted)', margin: '3px 0 0' }}>{subtitle}</p>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '14px 16px', ...style
    }}>
      {children}
    </div>
  )
}

export function CardTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{children}</h3>
      {right}
    </div>
  )
}

// ── Grid ──────────────────────────────────────────────────────
export function Grid({ children, cols = 2, gap = 16, style }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap, ...style }}>
      {children}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────
export function StatCard({ label, value, sub, color, icon }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: color || 'var(--text)', lineHeight: 1 }}>{value ?? '—'}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 22, opacity: 0.6 }}>{icon}</span>}
      </div>
    </Card>
  )
}

// ── Table ─────────────────────────────────────────────────────
export function Table({ cols, rows, keyFn }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.key} style={{
                fontSize: 10, color: 'var(--muted)', fontWeight: 500, textTransform: 'uppercase',
                letterSpacing: '0.05em', padding: '6px 10px', textAlign: c.align || 'left',
                borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap'
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={keyFn ? keyFn(row) : ri} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              {cols.map(c => (
                <td key={c.key} style={{
                  fontSize: 12, color: 'var(--text)', padding: '9px 10px',
                  textAlign: c.align || 'left', verticalAlign: 'middle'
                }}>
                  {c.render ? c.render(row, ri) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={cols.length} style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Score Bar ─────────────────────────────────────────────────
export function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, score || 0))
  const color = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#10b981'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
      <div style={{ flex: 1, height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 10, color: 'var(--muted)', width: 24, textAlign: 'right' }}>{pct}</span>
    </div>
  )
}

// ── Risk Badge ────────────────────────────────────────────────
export function RiskBadge({ level }) {
  const map = {
    critical: { bg: 'rgba(239,68,68,0.18)',   color: '#f87171', label: 'Critical' },
    high:     { bg: 'rgba(239,68,68,0.18)',   color: '#f87171', label: 'High' },
    medium:   { bg: 'rgba(245,158,11,0.18)',  color: '#fbbf24', label: 'Medium' },
    normal:   { bg: 'rgba(16,185,129,0.18)',  color: '#34d399', label: 'Normal' },
    low:      { bg: 'rgba(16,185,129,0.18)',  color: '#34d399', label: 'Low' },
  }
  const s = map[level] || map.medium
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 4,
      background: s.bg, color: s.color,
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {s.label}
    </span>
  )
}

// ── Loading / Error ───────────────────────────────────────────
export function LoadingBox({ h = 200 }) {
  return (
    <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, gap: 8 }}>
      <span style={{
        display: 'inline-block', width: 14, height: 14,
        border: '2px solid var(--accent)', borderTopColor: 'transparent',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite'
      }} />
      Loading…
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function ErrorBox({ message }) {
  return (
    <div style={{
      padding: '14px 16px', background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8,
      color: '#f87171', fontSize: 13,
    }}>
      ⚠️ {message || 'Failed to load. Check ML service is running.'}
    </div>
  )
}

// ── Form Controls ─────────────────────────────────────────────
export function Input({ label, ...props }) {
  return (
    <div>
      {label && <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>{label}</div>}
      <input {...props} style={{
        width: '100%', padding: '8px 10px',
        background: '#1e2235',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 7, color: '#e8eaf0',
        fontSize: 13, outline: 'none', boxSizing: 'border-box',
        ...(props.style || {})
      }} />
    </div>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <div>
      {label && <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>{label}</div>}
      <select {...props} style={{
        width: '100%', padding: '8px 10px',
        background: '#1e2235',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 7, color: '#e8eaf0',
        fontSize: 13, outline: 'none', cursor: 'pointer',
        ...(props.style || {})
      }}>
        {children}
      </select>
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────
// Variants map: bg | text color | border
const BTN_VARIANTS = {
  primary: {
    background: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    hoverBg: '#2563eb',
  },
  success: {
    background: 'rgba(16,185,129,0.2)',
    color: '#34d399',
    border: '1px solid rgba(16,185,129,0.4)',
    hoverBg: 'rgba(16,185,129,0.3)',
  },
  danger: {
    background: 'rgba(239,68,68,0.15)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.35)',
    hoverBg: 'rgba(239,68,68,0.25)',
  },
  ghost: {
    background: '#252840',
    color: '#c4c9d8',
    border: '1px solid rgba(255,255,255,0.15)',
    hoverBg: '#2e3354',
  },
}

export function Btn({ children, variant = 'primary', style, ...props }) {
  const [hovered, setHovered] = useState(false)
  const v = BTN_VARIANTS[variant] || BTN_VARIANTS.primary
  return (
    <button
      {...props}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '8px 16px',
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 600,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        transition: 'background 0.15s, opacity 0.15s',
        background: hovered && !props.disabled ? v.hoverBg : v.background,
        color: v.color,
        border: v.border,
        ...(style || {}),
      }}
    >
      {children}
    </button>
  )
}
