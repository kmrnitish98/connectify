const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Message = require('../models/Message')
const Conversation = require('../models/Conversation')
const Call = require('../models/Call')

// Map: userId -> Set of socketIds
const onlineUsers = new Map()

const socketHandler = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1]
      if (!token) return next(new Error('Authentication error: no token'))

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select('-password')
      if (!user) return next(new Error('Authentication error: user not found'))

      socket.user = user
      next()
    } catch (err) {
      next(new Error('Authentication error: invalid token'))
    }
  })

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString()
    console.log(`🟢 Socket connected: ${socket.user.name} (${socket.id})`)

    // Register user online
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set())
    }
    onlineUsers.get(userId).add(socket.id)
    
    socket.join(userId) // Join personal room for targeted events
    await User.findByIdAndUpdate(userId, { status: 'online', socketId: socket.id, lastSeen: new Date() })

    // Broadcast online status to everyone
    socket.broadcast.emit('user_online', { userId })

    // Send current online users to newly connected client
    socket.emit('online_users', Array.from(onlineUsers.keys()))

    // ─── Join conversation rooms (Deprecated, keeping for compatibility if needed) ───
    socket.on('join_conversation', (conversationId) => {
      // no-op, we use personal rooms now
    })

    socket.on('leave_conversation', (conversationId) => {
      // no-op
    })

    // ─── Real-time Messaging ──────────────────────────────────
    socket.on('send_message', async (data, callback) => {
      try {
        const { conversationId, text, type = 'text', fileUrl, filePublicId, fileName, fileSize, mimeType, replyTo } = data

        // Verify participant and populate to send back to clients
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
          fileUrl,
          filePublicId,
          fileName,
          fileSize,
          mimeType,
          replyTo: replyTo || null,
          readBy: [userId],
        })

        await message.populate('sender', 'name username avatar')
        if (replyTo) {
          await message.populate({ path: 'replyTo', populate: { path: 'sender', select: 'name username' } })
        }

        // Update conversation lastMessage
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          updatedAt: new Date(),
        })

        // Emit to all participants using their personal rooms
        conversation.participants.forEach(p => {
          io.to(p._id.toString()).emit('receive_message', { message, conversation })
        })

        callback?.({ success: true, message })
      } catch (err) {
        console.error('send_message error:', err)
        callback?.({ error: err.message })
      }
    })

    // ─── Typing Indicators ────────────────────────────────────
    socket.on('typing_start', async ({ conversationId }) => {
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
    })

    socket.on('typing_stop', async ({ conversationId }) => {
      const conv = await Conversation.findById(conversationId)
      if (!conv) return
      conv.participants.forEach(pId => {
        if (pId.toString() !== userId) {
          io.to(pId.toString()).emit('typing_stop', { userId, conversationId })
        }
      })
    })

    // ─── Read Receipts ────────────────────────────────────────
    socket.on('message_read', async ({ conversationId, messageId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, { $addToSet: { readBy: userId } })
        const conv = await Conversation.findById(conversationId)
        if (conv) {
          conv.participants.forEach(pId => {
            if (pId.toString() !== userId) {
              io.to(pId.toString()).emit('message_read', { messageId, readBy: userId })
            }
          })
        }
      } catch (err) {
        console.error('message_read error:', err)
      }
    })

    socket.on('messages_read', async ({ conversationId }) => {
      try {
        await Message.updateMany(
          { conversation: conversationId, readBy: { $ne: userId }, sender: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        )
        const conv = await Conversation.findById(conversationId)
        if (conv) {
          conv.participants.forEach(pId => {
            if (pId.toString() !== userId) {
              io.to(pId.toString()).emit('messages_read', { conversationId, readBy: userId })
            }
          })
        }
      } catch (err) {
        console.error('messages_read error:', err)
      }
    })

    // ─── WebRTC Signaling ────────────────────────────────────
    const createCallMessage = async (to, conversationId, callType, status, duration = 0) => {
      if (!conversationId) return
      try {
        const call = await Call.create({ caller: userId, receiver: to, callType, status, duration, conversation: conversationId })
        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          type: 'call',
          text: '',
          callData: { type: callType, status, duration },
          readBy: [userId],
        })
        await message.populate('sender', 'name username avatar')
        await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id, updatedAt: new Date() })
        
        // Emit message
        const conv = await Conversation.findById(conversationId).populate('participants', 'name username avatar status lastSeen')
        conv.participants.forEach(p => {
          io.to(p._id.toString()).emit('receive_message', { message, conversation: conv })
        })
      } catch (err) { console.error('Error creating call message:', err) }
    }

    socket.on('call_user', async ({ to, signal, callType, conversationId }) => {
      if (!onlineUsers.has(to)) {
        socket.emit('call_unavailable', { to })
        await createCallMessage(to, conversationId, callType, 'missed')
        return
      }
      io.to(to).emit('incoming_call', {
        from: userId,
        signal,
        callType, // 'video' | 'audio'
        conversationId,
        caller: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
      })
    })

    socket.on('call_timeout', async ({ to, callType, conversationId }) => {
      await createCallMessage(to, conversationId, callType, 'missed')
      if (onlineUsers.has(to)) {
        io.to(to).emit('call_timeout', { from: userId })
      }
    })

    socket.on('call_accepted', ({ to, signal }) => {
      if (onlineUsers.has(to)) {
        io.to(to).emit('call_accepted', { signal, from: userId })
      }
    })

    socket.on('call_rejected', async ({ to, conversationId, callType }) => {
      if (onlineUsers.has(to)) {
        io.to(to).emit('call_rejected', { from: userId })
      }
      await createCallMessage(to, conversationId, callType || 'video', 'rejected')
    })

    socket.on('call_ended', async ({ to, conversationId, callType, duration }) => {
      if (onlineUsers.has(to)) {
        io.to(to).emit('call_ended', { from: userId })
      }
      await createCallMessage(to, conversationId, callType || 'video', 'ended', duration)
    })

    socket.on('ice_candidate', ({ to, candidate }) => {
      if (onlineUsers.has(to)) {
        io.to(to).emit('ice_candidate', { candidate, from: userId })
      }
    })

    // ─── Manual Logout ───────────────────────────────────────
    socket.on('manual_logout', async () => {
      console.log(`🔴 User manually logged out: ${socket.user.name}`)
      // Clear all sockets for this user
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
    socket.on('disconnect', async () => {
      console.log(`🔴 Socket disconnected: ${socket.user.name} (${socket.id})`)
      const userSockets = onlineUsers.get(userId)
      if (userSockets) {
        userSockets.delete(socket.id)
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
