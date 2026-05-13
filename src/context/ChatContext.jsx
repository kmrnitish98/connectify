import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { getSocket } from '../socket/socket'
import { chatService } from '../services/chatService'
import { useAuth } from './AuthContext'

const ChatContext = createContext()

export const ChatProvider = ({ children }) => {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversationState] = useState(null)
  const [messages, setMessages] = useState({}) // { conversationId: Message[] }
  const [typingUsers, setTypingUsers] = useState({}) // { conversationId: { userId: userInfo } }
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const typingTimeouts = useRef({})

  // ─── Fetch Conversations ────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoadingConvs(true)
      try {
        const convs = await chatService.getConversations()
        setConversations(convs)
      } catch (err) {
        console.error('Failed to load conversations:', err)
      } finally {
        setLoadingConvs(false)
      }
    }
    load()
  }, [user])

  // ─── Socket Event Listeners ─────────────────────────────────
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !user) return

    // Online presence
    const onOnlineUsers = (userIds) => setOnlineUsers(new Set(userIds))
    const onUserOnline = ({ userId }) => setOnlineUsers(prev => new Set([...prev, userId]))
    const onUserOffline = ({ userId, lastSeen }) => {
      setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s })
      setConversations(prev => prev.map(c => {
        const hasUser = c.participants?.some(p => p._id === userId)
        if (!hasUser) return c
        return {
          ...c,
          participants: c.participants.map(p => p._id === userId ? { ...p, lastSeen, status: 'offline' } : p)
        }
      }))
    }

    // Incoming message
    const onReceiveMessage = (payload) => {
      const message = payload.message || payload
      const conversationObj = payload.conversation
      const cId = message.conversation || (typeof message.conversation === 'object' ? message.conversation._id : message.conversation)

      setMessages(prev => {
        const existing = prev[cId] || []
        if (existing.some(m => m._id === message._id)) return prev
        return { ...prev, [cId]: [...existing, message] }
      })

      setConversations(prev => {
        const exists = prev.some(c => c._id === cId)
        if (!exists && conversationObj) {
          const newConv = { ...conversationObj, lastMessage: message, updatedAt: new Date(), unreadCount: activeConversation?._id === cId ? 0 : 1 }
          return [newConv, ...prev].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        }
        return prev.map(c =>
          c._id === cId
            ? { ...c, lastMessage: message, updatedAt: new Date(), unreadCount: c._id === activeConversation?._id ? 0 : (c.unreadCount || 0) + 1 }
            : c
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      })
    }

    // Typing indicators
    const onTypingStart = ({ userId: uid, conversationId, user: typingUser }) => {
      if (uid === user._id) return
      setTypingUsers(prev => ({
        ...prev,
        [conversationId]: { ...(prev[conversationId] || {}), [uid]: typingUser },
      }))
    }
    const onTypingStop = ({ userId: uid, conversationId }) => {
      setTypingUsers(prev => {
        const conv = { ...(prev[conversationId] || {}) }
        delete conv[uid]
        return { ...prev, [conversationId]: conv }
      })
    }

    // Read receipts
    const onMessagesRead = ({ conversationId, readBy }) => {
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(m =>
          m.sender._id !== readBy && !m.readBy?.includes(readBy)
            ? { ...m, readBy: [...(m.readBy || []), readBy] }
            : m
        ),
      }))
    }

    socket.on('online_users', onOnlineUsers)
    socket.on('user_online', onUserOnline)
    socket.on('user_offline', onUserOffline)
    socket.on('receive_message', onReceiveMessage)
    socket.on('typing_start', onTypingStart)
    socket.on('typing_stop', onTypingStop)
    socket.on('messages_read', onMessagesRead)

    return () => {
      socket.off('online_users', onOnlineUsers)
      socket.off('user_online', onUserOnline)
      socket.off('user_offline', onUserOffline)
      socket.off('receive_message', onReceiveMessage)
      socket.off('typing_start', onTypingStart)
      socket.off('typing_stop', onTypingStop)
      socket.off('messages_read', onMessagesRead)
    }
  }, [user, activeConversation])

  // ─── Select Conversation ────────────────────────────────────
  const setActiveConversation = useCallback(async (conv) => {
    setActiveConversationState(conv)
    if (!conv) return

    const socket = getSocket()
    socket?.emit('join_conversation', conv._id)

    // Clear unread badge
    setConversations(prev =>
      prev.map(c => c._id === conv._id ? { ...c, unreadCount: 0 } : c)
    )

    // Load messages if not cached
    if (!messages[conv._id]) {
      setLoadingMsgs(true)
      try {
        const data = await chatService.getMessages(conv._id)
        setMessages(prev => ({ ...prev, [conv._id]: data.messages }))
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        setLoadingMsgs(false)
      }
    }

    // Mark as read
    socket?.emit('messages_read', { conversationId: conv._id })
    chatService.markAsRead(conv._id).catch(() => {})
  }, [messages])

  // ─── Load More Messages (pagination) ───────────────────────
  const loadMoreMessages = useCallback(async (conversationId, page) => {
    try {
      const data = await chatService.getMessages(conversationId, page)
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...data.messages, ...(prev[conversationId] || [])],
      }))
      return data.pagination
    } catch (err) {
      console.error('loadMoreMessages error:', err)
    }
  }, [])

  // ─── Send Message via Socket ────────────────────────────────
  const sendMessage = useCallback((conversationId, payload) => {
    return new Promise((resolve, reject) => {
      const socket = getSocket()
      if (!socket) return reject(new Error('Socket not connected'))

      socket.emit('send_message', { conversationId, ...payload }, (response) => {
        if (response?.error) reject(new Error(response.error))
        else resolve(response?.message)
      })
    })
  }, [])

  // ─── Typing Emitters ────────────────────────────────────────
  const startTyping = useCallback((conversationId) => {
    const socket = getSocket()
    socket?.emit('typing_start', { conversationId })

    // Auto stop after 3s
    clearTimeout(typingTimeouts.current[conversationId])
    typingTimeouts.current[conversationId] = setTimeout(() => {
      socket?.emit('typing_stop', { conversationId })
    }, 3000)
  }, [])

  const stopTyping = useCallback((conversationId) => {
    const socket = getSocket()
    clearTimeout(typingTimeouts.current[conversationId])
    socket?.emit('typing_stop', { conversationId })
  }, [])

  // ─── Update a message locally ───────────────────────────────
  const updateMessageLocally = useCallback((conversationId, messageId, updates) => {
    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(m =>
        m._id === messageId ? { ...m, ...updates } : m
      ),
    }))
  }, [])

  // ─── Remove message locally ─────────────────────────────────
  const removeMessageLocally = useCallback((conversationId, messageId) => {
    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).filter(m => m._id !== messageId),
    }))
  }, [])

  // ─── Add a new conversation (after search + create) ─────────
  const addConversation = useCallback((conv) => {
    setConversations(prev => {
      if (prev.some(c => c._id === conv._id)) return prev
      return [conv, ...prev]
    })
  }, [])

  const getOtherParticipant = useCallback((conv) => {
    if (!conv || !user) return null
    return conv.participants?.find(p => p._id !== user._id) || null
  }, [user])

  return (
    <ChatContext.Provider value={{
      conversations, activeConversation, messages, typingUsers, onlineUsers,
      loadingConvs, loadingMsgs,
      setActiveConversation, sendMessage, startTyping, stopTyping,
      loadMoreMessages, updateMessageLocally, removeMessageLocally,
      addConversation, getOtherParticipant,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => useContext(ChatContext)
