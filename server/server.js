require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')

const connectDB = require('./config/db')
require('./config/cloudinary') // Initialize Cloudinary

const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const conversationRoutes = require('./routes/conversations')
const messageRoutes = require('./routes/messages')
const uploadRoutes = require('./routes/upload')
const callRoutes = require('./routes/calls')
const errorHandler = require('./middleware/errorHandler')
const { socketHandler } = require('./socket/socketHandler')

// Connect to MongoDB
connectDB()

const app = express()
const server = http.createServer(app)

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
})

// Express Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/conversations', conversationRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/calls', callRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` })
})

// Global error handler
app.use(errorHandler)

// Initialize Socket.IO
socketHandler(io)

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📡 Socket.IO ready`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`)
    console.error(`   Run this to fix it:`)
    console.error(`   Get-NetTCPConnection -LocalPort ${PORT} | Select OwningProcess | ForEach-Object { taskkill /F /PID $_.OwningProcess }`)
    process.exit(1)
  } else {
    throw err
  }
})

module.exports = { app, io }
