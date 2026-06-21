import { cors, verifyToken, store } from './_lib.js'

// Consolidates: GET/POST /violations, PATCH /violations/status?id=&status=
export default function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const p = verifyToken(req)
  if (!p) return res.status(401).json({ error: 'Unauthorized' })

  const { action } = req.query

  if (!action) {
    if (req.method === 'GET') {
      const limit  = parseInt(req.query.limit) || 50
      const offset = parseInt(req.query.offset) || 0
      return res.json({ violations: store.violations.slice(offset, offset + limit), total: store.violations.length, limit, offset })
    }

    if (req.method === 'POST') {
      const { vehicle_number, vehicle_type, violation_type, latitude, longitude, location, notes } = req.body
      if (!vehicle_number || !violation_type) return res.status(400).json({ error: 'vehicle_number and violation_type required' })
      const id = 'VIO' + Date.now()
      const v  = {
        id, vehicle_number, vehicle_type: vehicle_type || 'UNKNOWN',
        violation_type, latitude, longitude, location: location || '',
        police_station: store.officers.find(o => o.id === p.id)?.station || 'Unknown',
        officer_id: p.id, notes: notes || '', status: 'pending',
        created_at: new Date().toISOString(),
      }
      store.violations.unshift(v)
      return res.status(201).json({ id, status: 'created' })
    }
    return res.status(405).end()
  }

  if (action === 'status') {
    if (!['commander', 'dcp'].includes(p.role)) return res.status(403).json({ error: 'Forbidden' })
    const { id, status } = req.query
    const v = store.violations.find(v => v.id === id)
    if (v) v.status = status
    return res.json({ id, status })
  }

  res.status(404).json({ error: 'Not found' })
}
