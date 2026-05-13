require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')

const connectDB = require('./config/db')
require('./config/cloudinary')

const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const conversationRoutes = require('./routes/conversations')
const messageRoutes = require('./routes/messages')
const uploadRoutes = require('./routes/upload')
const callRoutes = require('./routes/calls')
const errorHandler = require('./middleware/errorHandler')
const { socketHandler } = require('./socket/socketHandler')

connectDB()

const app = express()
const server = http.createServer(app)

// ─── CORS ─────────────────────────────────────────────────────
// Normalise CLIENT_URL — strip trailing slash, support comma-separated list
const rawClientUrl = process.env.CLIENT_URL || ''
const allowedOrigins = rawClientUrl
  ? rawClientUrl.split(',').map(u => u.trim().replace(/\/+$/, ''))
  : ['http://localhost:5173', 'http://localhost:5174']

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin) and allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

// ─── Socket.IO ────────────────────────────────────────────────
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'], // prefer WS, fallback to polling
  // Needed for Render free tier (sticky sessions workaround)
  allowEIO3: true,
})

// ─── Express Middleware ───────────────────────────────────────
app.use(cors(corsOptions))
app.options('*', cors(corsOptions)) // Pre-flight for all routes
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// ─── Health check (used by Render to detect service is up) ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), ts: new Date().toISOString() })
})

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/conversations', conversationRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/calls', callRoutes)

// 404
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` })
})

// Global error handler
app.use(errorHandler)

// ─── Initialize Socket.IO handler ────────────────────────────
socketHandler(io)

// ─── Start server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5034
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📡 Socket.IO ready | transports: websocket, polling`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
  console.log(`🔒 Allowed origins: ${allowedOrigins.join(', ')}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} already in use.`)
    process.exit(1)
  } else throw err
})

module.exports = { app, io }
