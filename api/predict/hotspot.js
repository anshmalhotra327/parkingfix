import { cors, verifyToken } from '../_lib.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '../../public/data')

const METRO_STATIONS = [
  { name:'Hosahalli',    lat:12.9776, lng:77.5188 },
  { name:'Majestic',     lat:12.9767, lng:77.5713 },
  { name:'MG Road',      lat:12.9756, lng:77.6099 },
  { name:'Indiranagar',  lat:12.9784, lng:77.6408 },
  { name:'Vijayanagar',  lat:12.9673, lng:77.5310 },
  { name:'Rajajinagar',  lat:12.9919, lng:77.5511 },
  { name:'Nagasandra',   lat:13.0484, lng:77.5133 },
  { name:'Byappanahalli',lat:12.9926, lng:77.6478 },
  { name:'Yelachenahalli',lat:12.8934,lng:77.5877 },
]

function haversine(lat1,lon1,lat2,lon2) {
  const R=6371000, phi1=lat1*Math.PI/180, phi2=lat2*Math.PI/180
  const dphi=(lat2-lat1)*Math.PI/180, dlam=(lon2-lon1)*Math.PI/180
  const a=Math.sin(dphi/2)**2+Math.cos(phi1)*Math.cos(phi2)*Math.sin(dlam/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

function nearestMetro(lat,lng) {
  let best=null, bestD=Infinity
  for (const m of METRO_STATIONS) {
    const d=haversine(lat,lng,m.lat,m.lng)
    if(d<bestD){bestD=d;best=m}
  }
  return [best.name, Math.round(bestD)]
}

// JS re-implementation of the trained GBT model using zone statistics
// Uses pre-computed grid impact scores as the primary signal
export default function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' })
  if (req.method !== 'POST') return res.status(405).end()

  const { lat, lng, hour, day_of_week, month, vehicle_type } = req.body
  const now = new Date()
  const h   = hour        ?? now.getUTCHours()
  const dow = day_of_week ?? now.getUTCDay()
  const mo  = month       ?? now.getUTCMonth() + 1

  const isPeak   = (h >= 7 && h <= 10) || (h >= 17 && h <= 20)
  const isNight  = h >= 22 || h <= 6
  const isWeekend= dow === 0 || dow === 6

  // Metro zone check
  const [metroName, metroDist] = nearestMetro(lat, lng)
  const isMetroZone = metroDist < 300

  // Look up grid cell impact score
  const latG = Math.floor(lat * 100)
  const lngG = Math.floor(lng * 100)
  const grid = JSON.parse(readFileSync(join(DATA, 'grid_impact.json'), 'utf8'))
  const cell = grid.find(g => g.lat_grid === latG && g.lng_grid === lngG)
  const baseScore = cell ? cell.impact_score / 100 : 0.1

  // Apply time multipliers (mirrors the GBT feature weights)
  let prob = baseScore
  if (isPeak)      prob *= 1.45
  if (isWeekend)   prob *= 1.15
  if (isMetroZone) prob *= 1.30
  if (isNight)     prob *= 0.60
  if (mo >= 11 || mo <= 1) prob *= 1.10  // Nov-Jan peak months

  // Clamp to [0.05, 0.97]
  prob = Math.min(0.97, Math.max(0.05, prob))
  prob = Math.round(prob * 1000) / 1000

  const risk = prob > 0.85 ? 'critical' : prob > 0.65 ? 'high' : prob > 0.45 ? 'medium' : 'low'

  const officers = prob > 0.85 ? 3 : prob > 0.65 ? 2 : 1
  const reasons = []
  if (isPeak)       reasons.push('peak hour')
  if (isMetroZone)  reasons.push('metro zone')
  if (isWeekend)    reasons.push('weekend surge')
  if (!reasons.length) reasons.push('historical pattern')

  res.json({
    probability: prob,
    risk_level: risk,
    is_metro_zone: isMetroZone,
    nearest_metro: [metroName, metroDist],
    features_used: { hour: h, day_of_week: dow, month: mo, is_peak: isPeak ? 1 : 0, is_weekend: isWeekend ? 1 : 0, is_metro_zone: isMetroZone ? 1 : 0, base_score: baseScore },
    recommendation: {
      deploy_officers: officers,
      reason: `Violation probability ${Math.round(prob*100)}%; ${reasons.join(', ')}`,
    },
  })
}
