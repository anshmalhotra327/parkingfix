import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cors, store, JWT_SECRET, verifyToken } from './_lib.js'

// Consolidates: POST /auth/login, GET /auth/me
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { action } = req.query

  if (action === 'login') {
    if (req.method !== 'POST') return res.status(405).end()
    const { badge_id, password } = req.body
    const officer = store.officers.find(o => o.badge_id === badge_id)
    if (!officer) return res.status(401).json({ error: 'Invalid credentials' })
    const valid = await bcrypt.compare(password, officer.password)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
    const token = jwt.sign({ id: officer.id, badge_id: officer.badge_id, role: officer.role }, JWT_SECRET, { expiresIn: '12h' })
    const { password: _, ...safe } = officer
    return res.json({ token, officer: safe })
  }

  if (action === 'me') {
    const payload = verifyToken(req)
    if (!payload) return res.status(401).json({ error: 'Unauthorized' })
    const officer = store.officers.find(o => o.id === payload.id)
    if (!officer) return res.status(401).json({ error: 'Not found' })
    const { password: _, ...safe } = officer
    return res.json(safe)
  }

  res.status(404).json({ error: 'Not found' })
}
