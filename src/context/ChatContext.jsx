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

  // Refs to avoid stale closures in socket handlers
  const typingTimeouts = useRef({})
  const activeConversationRef = useRef(null)  // ← FIX #2: ref mirrors state
  const messagesRef = useRef({})              // ← FIX #3: ref mirrors messages

  // Keep refs in sync with state
  const updateActiveConversation = useCallback((conv) => {
    activeConversationRef.current = conv
    setActiveConversationState(conv)
  }, [])

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
  // FIX #2: Dependency array is just [user] — no activeConversation so listeners
  // are registered ONCE and use the ref to read the current active conversation.
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
          participants: c.participants.map(p =>
            p._id === userId ? { ...p, lastSeen, status: 'offline' } : p
          )
        }
      }))
    }

    // Incoming message
    // FIX #1: Use activeConversationRef.current instead of closure-captured activeConversation
    const onReceiveMessage = (payload) => {
      const message = payload.message || payload
      const conversationObj = payload.conversation
      const cId = message.conversation?._id || message.conversation

      // FIX #16: O(1) deduplication using a Map lookup
      setMessages(prev => {
        const existing = prev[cId] || []
        // Quick ID lookup to prevent duplicates
        if (existing.length > 0 && existing[existing.length - 1]?._id === message._id) return prev
        if (existing.some(m => m._id === message._id)) return prev
        const updated = { ...prev, [cId]: [...existing, message] }
        messagesRef.current = updated
        return updated
      })

      setConversations(prev => {
        const activeId = activeConversationRef.current?._id
        const exists = prev.some(c => c._id === cId)
        if (!exists && conversationObj) {
          const newConv = {
            ...conversationObj,
            lastMessage: message,
            updatedAt: new Date(),
            unreadCount: activeId === cId ? 0 : 1,
          }
          return [newConv, ...prev].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        }
        return prev.map(c =>
          c._id === cId
            ? {
                ...c,
                lastMessage: message,
                updatedAt: new Date(),
                unreadCount: activeId === cId ? 0 : (c.unreadCount || 0) + 1,
              }
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
          m.sender?._id !== readBy && !m.readBy?.includes(readBy)
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
  }, [user]) // ← FIX #2: no activeConversation in deps

  // ─── Select Conversation ────────────────────────────────────
  // FIX #3: No longer depends on `messages` — uses messagesRef instead
  const setActiveConversation = useCallback(async (conv) => {
    updateActiveConversation(conv)
    if (!conv) return

    const socket = getSocket()
    socket?.emit('join_conversation', conv._id)

    // Clear unread badge
    setConversations(prev =>
      prev.map(c => c._id === conv._id ? { ...c, unreadCount: 0 } : c)
    )

    // Load messages if not cached (use ref to avoid stale closure)
    if (!messagesRef.current[conv._id]) {
      setLoadingMsgs(true)
      try {
        const data = await chatService.getMessages(conv._id)
        setMessages(prev => {
          const updated = { ...prev, [conv._id]: data.messages }
          messagesRef.current = updated
          return updated
        })
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        setLoadingMsgs(false)
      }
    }

    // Mark as read
    socket?.emit('messages_read', { conversationId: conv._id })
    chatService.markAsRead(conv._id).catch(() => {})
  }, [updateActiveConversation]) // ← FIX #3: no messages dep

  // ─── Load More Messages (pagination) ───────────────────────
  const loadMoreMessages = useCallback(async (conversationId, page) => {
    try {
      const data = await chatService.getMessages(conversationId, page)
      setMessages(prev => {
        const updated = {
          ...prev,
          [conversationId]: [...data.messages, ...(prev[conversationId] || [])],
        }
        messagesRef.current = updated
        return updated
      })
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

// eslint-disable-next-line react-refresh/only-export-components
export const useChat = () => useContext(ChatContext)
