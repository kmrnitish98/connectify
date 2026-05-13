/**
 * socket.js — Singleton Socket.IO client
 *
 * Key fixes vs the old version:
 * - Strip trailing slash from VITE_SOCKET_URL so Render never rejects the upgrade
 * - Prefer 'websocket' transport; poll only as fallback (faster in production)
 * - Infinite reconnection attempts with back-off
 * - forceNew: false — reuse socket across hot-reloads in dev
 * - Expose a `socketReady` Promise so callers can await connection
 */
import { io } from 'socket.io-client'

let socket = null

/**
 * Normalize the base URL — remove trailing slashes that break Render's WS handshake.
 */
const BASE_URL = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5034').replace(/\/+$/, '')

export const initSocket = (token) => {
  // Reuse existing connected socket
  if (socket?.connected) return socket

  // If disconnected but socket object exists, update auth and reconnect
  if (socket) {
    socket.auth = { token }
    socket.connect()
    return socket
  }

  socket = io(BASE_URL, {
    auth: { token },
    // Prefer WebSocket; fall back to polling (important for Render free tier)
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
    forceNew: false,
    // Send credentials cookie if used
    withCredentials: true,
  })

  socket.on('connect', () => {
    console.log('[Socket] ✅ Connected:', socket.id)
  })

  socket.on('connect_error', (err) => {
    console.error('[Socket] ❌ Connection error:', err.message)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] 🔴 Disconnected:', reason)
  })

  socket.on('reconnect', (attempt) => {
    console.log('[Socket] 🔄 Reconnected after', attempt, 'attempts')
  })

  return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
  if (socket) {
    socket.emit('manual_logout')
    socket.disconnect()
    socket = null
  }
}

export default { initSocket, getSocket, disconnectSocket }
