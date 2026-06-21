import { cors, verifyToken } from '../_lib.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '../../public/data')

const METRO_STATIONS = [
  { name: 'Hosahalli',     lat: 12.9776, lng: 77.5188 },
  { name: 'Majestic',      lat: 12.9767, lng: 77.5713 },
  { name: 'MG Road',       lat: 12.9756, lng: 77.6099 },
  { name: 'Indiranagar',   lat: 12.9784, lng: 77.6408 },
  { name: 'Byappanahalli', lat: 12.9926, lng: 77.6478 },
  { name: 'Vijayanagar',   lat: 12.9673, lng: 77.5310 },
  { name: 'Rajajinagar',   lat: 12.9919, lng: 77.5511 },
  { name: 'Nagasandra',    lat: 13.0484, lng: 77.5133 },
  { name: 'Yelachenahalli',lat: 12.8934, lng: 77.5877 },
]

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const phi1 = lat1 * Math.PI / 180, phi2 = lat2 * Math.PI / 180
  const dphi = (lat2 - lat1) * Math.PI / 180
  const dlam = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dphi/2)**2 + Math.cos(phi1)*Math.cos(phi2)*Math.sin(dlam/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' })

  const radius = Math.min(2000, Math.max(50, parseInt(req.query.radius) || 300))
  const CELL_M = 1100.0
  const heatmap = JSON.parse(readFileSync(join(DATA, 'heatmap_data.json'), 'utf8'))

  const result = METRO_STATIONS.map(m => {
    const cellsNeeded = Math.ceil(radius / CELL_M) + 1
    const latG = Math.floor(m.lat * 100)
    const lngG = Math.floor(m.lng * 100)

    const candidates = heatmap.filter(p =>
      Math.abs(p.lat_grid - latG) <= cellsNeeded &&
      Math.abs(p.lng_grid - lngG) <= cellsNeeded
    )

    let total = 0
    for (const p of candidates) {
      const dist = haversine(m.lat, m.lng, p.lat, p.lng)
      let w = 0
      if (dist <= radius) {
        w = 1
      } else if (dist <= radius + CELL_M / 2) {
        w = 1 - (dist - radius) / (CELL_M / 2)
      }
      total += Math.round(p.count * w)
    }

    const scale = Math.max(1, (radius / 300) ** 2)
    return {
      name: m.name,
      lat: m.lat,
      lng: m.lng,
      violations_in_radius: total,
      radius_m: radius,
      risk_level: total > 500 * scale ? 'high' : total > 100 * scale ? 'medium' : 'low',
    }
  })

  result.sort((a, b) => b.violations_in_radius - a.violations_in_radius)
  const totalAll = result.reduce((s, z) => s + z.violations_in_radius, 0)
  res.json({ metro_zones: result, radius_m: radius, total_violations: totalAll })
}
