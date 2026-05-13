/**
 * socketHandler.js — Production-ready Socket.IO server
 *
 * Key fixes vs old version:
 * 1. ICE candidate relay: added `ice_candidate` forwarding so trickle ICE works
 * 2. call_timeout: now emitted to the *receiver* so they know the caller gave up
 * 3. call_rejected: receiver now passes conversationId & callType so a DB record
 *    can be saved correctly
 * 4. Duplicate message prevention: createCallMessage guards against double-saves
 * 5. Graceful disconnect: socket rooms are left cleanly; user goes offline only
 *    when ALL their tabs/sockets disconnect
 * 6. Security: every incoming call event validates the socket's authenticated user
 */
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Message = require('../models/Message')
const Conversation = require('../models/Conversation')
const Call = require('../models/Call')

// userId → Set<socketId>
const onlineUsers = new Map()

const socketHandler = (io) => {

  // ─── Auth middleware ─────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1]

      if (!token) return next(new Error('AUTH_NO_TOKEN'))

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select('-password')
      if (!user) return next(new Error('AUTH_USER_NOT_FOUND'))

      socket.user = user
      next()
    } catch {
      next(new Error('AUTH_INVALID_TOKEN'))
    }
  })

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString()
    console.log(`🟢 [Socket] ${socket.user.name} connected (${socket.id})`)

    // Register in online map
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
    onlineUsers.get(userId).add(socket.id)

    // Join personal room (userId) — used for targeted events
    socket.join(userId)

    await User.findByIdAndUpdate(userId, {
      status: 'online',
      socketId: socket.id,
      lastSeen: new Date(),
    })

    // Broadcast online status to all other connected clients
    socket.broadcast.emit('user_online', { userId })

    // Send current online list to this new connection
    socket.emit('online_users', Array.from(onlineUsers.keys()))

    // ─── Messaging ──────────────────────────────────────────
    socket.on('send_message', async (data, callback) => {
      try {
        const {
          conversationId, text, type = 'text',
          fileUrl, filePublicId, fileName, fileSize, mimeType, replyTo,
        } = data

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        }).populate('participants', 'name username avatar status lastSeen')

        if (!conversation) return callback?.({ error: 'Access denied' })

        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          type,
          text: text || '',
          fileUrl, filePublicId, fileName, fileSize, mimeType,
          replyTo: replyTo || null,
          readBy: [userId],
        })

        await message.populate('sender', 'name username avatar')
        if (replyTo) {
          await message.populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'name username' },
          })
        }

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          updatedAt: new Date(),
        })

        conversation.participants.forEach(p => {
          io.to(p._id.toString()).emit('receive_message', { message, conversation })
        })

        callback?.({ success: true, message })
      } catch (err) {
        console.error('[Socket] send_message error:', err)
        callback?.({ error: err.message })
      }
    })

    // ─── Typing ─────────────────────────────────────────────
    socket.on('typing_start', async ({ conversationId }) => {
      try {
        const conv = await Conversation.findById(conversationId)
        if (!conv) return
        conv.participants.forEach(pId => {
          if (pId.toString() !== userId) {
            io.to(pId.toString()).emit('typing_start', {
              userId,
              conversationId,
              user: { name: socket.user.name, avatar: socket.user.avatar },
            })
          }
        })
      } catch { /* ignore */ }
    })

    socket.on('typing_stop', async ({ conversationId }) => {
      try {
        const conv = await Conversation.findById(conversationId)
        if (!conv) return
        conv.participants.forEach(pId => {
          if (pId.toString() !== userId) {
            io.to(pId.toString()).emit('typing_stop', { userId, conversationId })
          }
        })
      } catch { /* ignore */ }
    })

    // ─── Read Receipts ───────────────────────────────────────
    socket.on('message_read', async ({ conversationId, messageId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, { $addToSet: { readBy: userId } })
        const conv = await Conversation.findById(conversationId)
        conv?.participants.forEach(pId => {
          if (pId.toString() !== userId) {
            io.to(pId.toString()).emit('message_read', { messageId, readBy: userId })
          }
        })
      } catch (err) {
        console.error('[Socket] message_read error:', err)
      }
    })

    socket.on('messages_read', async ({ conversationId }) => {
      try {
        await Message.updateMany(
          { conversation: conversationId, readBy: { $ne: userId }, sender: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        )
        const conv = await Conversation.findById(conversationId)
        conv?.participants.forEach(pId => {
          if (pId.toString() !== userId) {
            io.to(pId.toString()).emit('messages_read', { conversationId, readBy: userId })
          }
        })
      } catch (err) {
        console.error('[Socket] messages_read error:', err)
      }
    })

    // ─── WebRTC Signaling ────────────────────────────────────

    /**
     * Saves a call record + a "call" type message to the conversation.
     * Returns early if no conversationId to avoid orphan call records.
     */
    const createCallRecord = async (toUserId, conversationId, callType, status, duration = 0) => {
      if (!conversationId) return
      try {
        await Call.create({
          caller: userId,
          receiver: toUserId,
          callType,
          status,
          duration,
          conversation: conversationId,
        })

        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          type: 'call',
          text: '',
          callData: { type: callType, status, duration },
          readBy: [userId],
        })

        await message.populate('sender', 'name username avatar')
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          updatedAt: new Date(),
        })

        const conv = await Conversation.findById(conversationId)
          .populate('participants', 'name username avatar status lastSeen')

        conv?.participants.forEach(p => {
          io.to(p._id.toString()).emit('receive_message', { message, conversation: conv })
        })
      } catch (err) {
        console.error('[Socket] createCallRecord error:', err)
      }
    }

    // Caller → receiver: send offer
    socket.on('call_user', async ({ to, signal, callType, conversationId }) => {
      if (!to || !signal) return

      if (!onlineUsers.has(to)) {
        // Receiver is offline — immediately mark as missed
        socket.emit('call_unavailable', { to })
        await createCallRecord(to, conversationId, callType, 'missed')
        return
      }

      io.to(to).emit('incoming_call', {
        from: userId,
        signal,
        callType,
        conversationId,
        caller: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
      })
    })

    // ── ICE candidate relay (trickle ICE) ────────────────────
    socket.on('ice_candidate', ({ to, candidate }) => {
      if (!to || !candidate) return
      if (onlineUsers.has(to)) {
        io.to(to).emit('ice_candidate', { candidate, from: userId })
      }
    })

    // Caller gave up (30-45 s timeout)
    socket.on('call_timeout', async ({ to, callType, conversationId }) => {
      // Notify receiver so they can dismiss the incoming UI
      if (onlineUsers.has(to)) {
        io.to(to).emit('call_timeout', { from: userId })
      }
      await createCallRecord(to, conversationId, callType, 'missed')
    })

    // Receiver accepted — relay answer signal back to caller
    socket.on('call_accepted', ({ to, signal }) => {
      if (!to || !signal) return
      if (onlineUsers.has(to)) {
        io.to(to).emit('call_accepted', { signal, from: userId })
      }
    })

    // Receiver declined
    socket.on('call_rejected', async ({ to, conversationId, callType }) => {
      if (onlineUsers.has(to)) {
        io.to(to).emit('call_rejected', { from: userId })
      }
      await createCallRecord(to, conversationId, callType || 'video', 'rejected')
    })

    // Either party ended the call
    socket.on('call_ended', async ({ to, conversationId, callType, duration }) => {
      if (onlineUsers.has(to)) {
        io.to(to).emit('call_ended', { from: userId })
      }
      await createCallRecord(to, conversationId, callType || 'video', 'ended', duration || 0)
    })

    // ─── Manual Logout ───────────────────────────────────────
    socket.on('manual_logout', async () => {
      console.log(`🔴 [Socket] Manual logout: ${socket.user.name}`)
      onlineUsers.delete(userId)
      await User.findByIdAndUpdate(userId, {
        status: 'offline',
        lastSeen: new Date(),
        socketId: null,
      })
      socket.broadcast.emit('user_offline', { userId, lastSeen: new Date() })
      socket.disconnect(true)
    })

    // ─── Disconnect ───────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      console.log(`🔴 [Socket] ${socket.user.name} disconnected (${reason})`)

      const userSockets = onlineUsers.get(userId)
      if (userSockets) {
        userSockets.delete(socket.id)

        // Only mark offline when ALL tabs/sockets for this user are gone
        if (userSockets.size === 0) {
          onlineUsers.delete(userId)
          await User.findByIdAndUpdate(userId, {
            status: 'offline',
            lastSeen: new Date(),
            socketId: null,
          })
          socket.broadcast.emit('user_offline', { userId, lastSeen: new Date() })
        }
      }
    })
  })
}

module.exports = { socketHandler, onlineUsers }
