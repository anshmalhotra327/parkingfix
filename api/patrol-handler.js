import { cors, verifyToken, store } from './_lib.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '../public/data')

// Consolidates: GET /patrol/active, POST /patrol/approve, POST /patrol/dismiss, GET /patrol/recommendations
export default function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { action } = req.query

  if (action === 'active') {
    if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' })
    return res.json(store.recommendations.filter(r => r.status === 'active').slice(0, 20))
  }

  if (action === 'approve') {
    const p = verifyToken(req)
    if (!p) return res.status(401).json({ error: 'Unauthorized' })
    if (!['commander', 'dcp'].includes(p.role)) return res.status(403).json({ error: 'Forbidden' })
    const { id } = req.query
    const rec = store.recommendations.find(r => r.id === id)
    if (rec) rec.status = 'approved'
    return res.json({ status: 'approved' })
  }

  if (action === 'dismiss') {
    if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' })
    const { id } = req.query
    const rec = store.recommendations.find(r => r.id === id)
    if (rec) rec.status = 'dismissed'
    return res.json({ status: 'dismissed' })
  }

  if (action === 'recommendations') {
    if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' })

    const station   = req.query.station || 'Upparpet'
    const shiftHour = parseInt(req.query.hour) || new Date().getHours()
    const isPeak    = (shiftHour >= 7 && shiftHour <= 10) || (shiftHour >= 17 && shiftHour <= 20)

    const stats     = JSON.parse(readFileSync(join(DATA, 'station_stats.json'), 'utf8'))
    const junctions = JSON.parse(readFileSync(join(DATA, 'junction_impact.json'), 'utf8'))

    const row       = stats.find(s => s.police_station === station) || stats[0]
    const cityAvg   = stats.reduce((s, r) => s + r.total, 0) / stats.length
    const loadRatio = row.total / cityAvg

    let officers = Math.max(1, Math.round(loadRatio * 2))
    if (isPeak) officers = Math.min(officers + 1, 6)

    const reasons = []
    if (loadRatio > 1.5) reasons.push(`${loadRatio.toFixed(1)}× city average load`)
    if (row.peak_pct > 40) reasons.push(`${row.peak_pct}% peak-hour violations`)
    if ((row.metro_zone || 0) > 100) reasons.push('high metro zone exposure')
    if (!reasons.length) reasons.push('standard patrol schedule')

    const topJunctions = junctions.slice(0, 5)
    const id = 'REC' + Date.now()
    store.recommendations.unshift({
      id, station, location: topJunctions[0]?.junction_name || 'City-wide',
      message: reasons.join('; '), officers,
      priority: loadRatio > 2 ? 'high' : 'medium',
      status: 'active', created_at: new Date().toISOString(),
    })

    return res.json({
      station, shift_hour: shiftHour, is_peak: isPeak,
      recommended_officers: officers,
      reasoning: reasons.join('; '),
      station_load_ratio: Math.round(loadRatio * 100) / 100,
      alert_level: loadRatio > 2 ? 'high' : loadRatio > 1.2 ? 'medium' : 'normal',
      top_deployment_junctions: topJunctions.map(j => ({
        junction_name: j.junction_name, impact_score: j.impact_score, total_violations: j.total_violations,
      })),
      recommendation_id: id,
    })
  }

  res.status(404).json({ error: 'Not found' })
}
