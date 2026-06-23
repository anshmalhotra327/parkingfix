import { cors, verifyToken } from './_lib.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '../public/data')

// GET /api/cascade/cell?lat_grid=X&lng_grid=Y
// GET /api/cascade/hotspots  (top cells with cascade data)
export default function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' })

  const cascadeMap = JSON.parse(readFileSync(join(DATA, 'cascade.json'), 'utf8'))
  const { action } = req.query

  if (action === 'cell') {
    const lat_grid = req.query.lat_grid
    const lng_grid = req.query.lng_grid
    const key = `${lat_grid}_${lng_grid}`
    const cell = cascadeMap[key]
    if (!cell) return res.json({ found: false })
    return res.json({ found: true, key, ...cell })
  }

  // Default: return all hotspot cells (for map markers)
  const hotspots = Object.entries(cascadeMap).map(([key, v]) => ({
    key,
    lat: v.lat,
    lng: v.lng,
    count: v.count,
    intensity: v.intensity,
    neighbor_count: v.neighbors.length,
    max_cascade_risk: v.neighbors[0]?.cascade_risk || 0,
  }))
  hotspots.sort((a, b) => b.count - a.count)
  res.json({ hotspots })
}
