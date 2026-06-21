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
// Verified bcrypt hash of "password123" (cost 10) — confirmed with a real bcrypt
// implementation, not a copy-pasted placeholder. bcryptjs accepts $2a$/$2b$/$2y$ interchangeably.
const DEMO_PASSWORD_HASH = '$2b$10$Eqz9q8uPGuK1BR3weWbkGePQFlB379uwtH8w1gBWBIopiKp5hHfN2'

export const store = {
  officers: [
    { id:'USR001', badge_id:'BTP001', name:'Suresh Kumar',   station:'Upparpet',       role:'dcp',       password:DEMO_PASSWORD_HASH },
    { id:'USR002', badge_id:'BTP002', name:'Ravi Shankar',   station:'Upparpet',       role:'commander', password:DEMO_PASSWORD_HASH },
    { id:'USR003', badge_id:'BTP003', name:'Kavitha Reddy',  station:'Shivajinagar',   role:'commander', password:DEMO_PASSWORD_HASH },
    { id:'USR004', badge_id:'BTP004', name:'Mahesh Naik',    station:'Malleshwaram',   role:'officer',   password:DEMO_PASSWORD_HASH },
    { id:'USR005', badge_id:'BTP005', name:'Priya Sharma',   station:'HAL Old Airport',role:'officer',   password:DEMO_PASSWORD_HASH },
  ],
  violations: [],
  recommendations: [],
  alerts: [
    { id:'ALT_INIT', type:'system', title:'System Online', body:'ParkingIQ platform is active.', station:'All Stations', severity:'low', is_read:0, created_at: new Date().toISOString() },
  ],
}
