import 'dotenv/config'
import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { MulterError } from 'multer'
import { adminRouter } from './routes/admin.js'
import { menuRouter } from './routes/menu.js'

const app = express()
app.set('trust proxy', true)
const PORT = Number(process.env.PORT) || 4000
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/api/menu', menuRouter)
app.use('/api/admin', adminRouter)

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof MulterError) {
    res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Photo is too large (max 8MB)' : err.message })
    return
  }
  if (err instanceof Error) {
    res.status(400).json({ error: err.message })
    return
  }
  res.status(500).json({ error: 'Unexpected server error' })
}
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`PlateView API listening on port ${PORT}`)
})
