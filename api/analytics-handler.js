import { cors, verifyToken } from './_lib.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '../public/data')

function load(name) {
  return JSON.parse(readFileSync(join(DATA, name), 'utf8'))
}

// Consolidates: GET /analytics/heatmap, GET /analytics/overview
export default function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { action } = req.query

  if (action === 'heatmap') {
    const minCount = parseInt(req.query.min_count) || 3
    const all = load('heatmap_data.json')
    const points = all.filter(p => p.count >= minCount)
    const maxCount = points.reduce((m, p) => Math.max(m, p.count), 0)
    return res.json({ points, max_count: maxCount, total_points: points.length })
  }

  if (action === 'overview') {
    const summary       = load('summary.json')
    const stationStats  = load('station_stats.json')
    const hourly        = load('hourly_pattern.json')
    const monthly       = load('monthly_pattern.json')
    const vehicleTypes  = load('vehicle_type_stats.json')
    const violTypes     = load('violation_type_counts.json')

    return res.json({
      summary: { ...summary, live_violations_filed: 0 },
      top_stations: stationStats.slice(0, 10),
      hourly_pattern: hourly,
      monthly_pattern: monthly,
      vehicle_types: vehicleTypes.slice(0, 8),
      violation_types: violTypes.slice(0, 10).map(v => [v.name, v.val]),
    })
  }

  res.status(404).json({ error: 'Not found' })
}
