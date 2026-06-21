import { cors, verifyToken } from '../_lib.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '../../public/data')

export default function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' })

  const topN = parseInt(req.query.top_n) || 20
  const all = JSON.parse(readFileSync(join(DATA, 'junction_impact.json'), 'utf8'))
  const junctions = all.slice(0, topN)

  res.json({
    junctions,
    formula: 'score = freq(40%) + peak_hour(30%) + main_road(20%) + spread(10%)',
  })
}
