// Shared utilities for all API routes
import jwt from 'jsonwebtoken'

export const JWT_SECRET = process.env.JWT_SECRET || 'parking-iq-secret-2024'
export const DATA_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}/data`
  : 'http://localhost:5173/data'

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type')
}

export function verifyToken(req) {
  const auth = req.headers.authorization || ''
  if (!auth.startsWith('Bearer ')) return null
  try { return jwt.verify(auth.slice(7), JWT_SECRET) }
  catch { return null }
}

// In-memory store (resets on cold start — fine for demo/vercel)
export const store = {
  officers: [
    { id:'USR001', badge_id:'BTP001', name:'Suresh Kumar',   station:'Upparpet',       role:'dcp',       password:'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyc0b0LDi' },
    { id:'USR002', badge_id:'BTP002', name:'Ravi Shankar',   station:'Upparpet',       role:'commander', password:'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyc0b0LDi' },
    { id:'USR003', badge_id:'BTP003', name:'Kavitha Reddy',  station:'Shivajinagar',   role:'commander', password:'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyc0b0LDi' },
    { id:'USR004', badge_id:'BTP004', name:'Mahesh Naik',    station:'Malleshwaram',   role:'officer',   password:'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyc0b0LDi' },
    { id:'USR005', badge_id:'BTP005', name:'Priya Sharma',   station:'HAL Old Airport',role:'officer',   password:'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyc0b0LDi' },
  ],
  violations: [],
  recommendations: [],
  alerts: [
    { id:'ALT_INIT', type:'system', title:'System Online', body:'ParkingIQ platform is active.', station:'All Stations', severity:'low', is_read:0, created_at: new Date().toISOString() },
  ],
}

// password123 bcrypt hash above
