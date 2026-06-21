import { cors, verifyToken, store } from './_lib.js'

// Consolidates: GET /alerts, GET /alerts/unread, PATCH /alerts/read?id=
// Routed here via vercel.json rewrites; action comes from the matched path segment.
export default function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { action } = req.query

  if (!action) {
    return res.json(store.alerts.slice(0, 50))
  }

  if (action === 'unread') {
    return res.json(store.alerts.filter(a => !a.is_read))
  }

  if (action === 'read') {
    const { id } = req.query
    if (id === 'all') {
      store.alerts.forEach(a => { a.is_read = 1 })
    } else {
      const a = store.alerts.find(a => a.id === id)
      if (a) a.is_read = 1
    }
    return res.json({ status: 'ok' })
  }

  res.status(404).json({ error: 'Not found' })
}
