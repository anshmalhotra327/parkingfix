import { cors, verifyToken } from './_lib.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '../public/data')

// GET /api/recidivism/watchlist?limit=N&urgency=X
// GET /api/recidivism/lookup?plate=X
export default function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { action } = req.query
  const all = JSON.parse(readFileSync(join(DATA, 'recidivism.json'), 'utf8'))

  if (action === 'watchlist') {
    const limit   = parseInt(req.query.limit) || 50
    const urgency = req.query.urgency || null
    let filtered  = urgency ? all.filter(r => r.urgency === urgency) : all
    return res.json({
      watchlist: filtered.slice(0, limit),
      total: filtered.length,
      summary: {
        critical: all.filter(r => r.urgency === 'critical').length,
        high:     all.filter(r => r.urgency === 'high').length,
        medium:   all.filter(r => r.urgency === 'medium').length,
        low:      all.filter(r => r.urgency === 'low').length,
      }
    })
  }

  if (action === 'lookup') {
    const plate = (req.query.plate || '').toUpperCase()
    const rec = all.find(r => r.vehicle_number === plate)
    if (!rec) return res.json({ found: false, vehicle_number: plate })
    return res.json({ found: true, ...rec })
  }

  // Default: return summary stats
  const avgProb = all.reduce((s, r) => s + r.reoffense_prob, 0) / all.length
  res.json({
    total_scored: all.length,
    avg_reoffense_probability: Math.round(avgProb * 1000) / 1000,
    summary: {
      critical: all.filter(r => r.urgency === 'critical').length,
      high:     all.filter(r => r.urgency === 'high').length,
      medium:   all.filter(r => r.urgency === 'medium').length,
      low:      all.filter(r => r.urgency === 'low').length,
    }
  })
}
