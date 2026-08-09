import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { adminRouter } from './routes/admin.js'
import { menuRouter } from './routes/menu.js'

const app = express()
const PORT = Number(process.env.PORT) || 4000
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/api/menu', menuRouter)
app.use('/api/admin', adminRouter)

app.listen(PORT, () => {
  console.log(`PlateView API listening on port ${PORT}`)
})
