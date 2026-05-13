import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Search, Plus, Settings, Bell, MessageSquare, Hash,
  Users, Zap, LogOut, Moon, Sun, Star, UserPlus, X, Phone
} from 'lucide-react'
import Avatar from './Avatar'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { useTheme } from '../context/ThemeContext'
import { userService } from '../services/userService'
import { chatService } from '../services/chatService'
import { cn } from '../utils/helpers'
import { staggerContainer, staggerItem } from '../animations/variants'
import toast from 'react-hot-toast'
import { ChatListSkeleton } from './Skeleton'

const RAIL_ITEMS = [
  { icon: MessageSquare, id: 'chats', label: 'Chats', path: '/chat' },
  { icon: Hash, id: 'channels', label: 'Channels', path: '/groups' },
  { icon: Phone, id: 'calls', label: 'Calls', path: '/calls' },
  { icon: Star, id: 'starred', label: 'Starred', path: '/starred' },
]

const Sidebar = () => {
  const { user, logout } = useAuth()
  const { conversations, activeConversation, setActiveConversation,
    onlineUsers, loadingConvs, addConversation, getOtherParticipant } = useChat()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState('chats')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatQuery, setNewChatQuery] = useState('')
  const [newChatResults, setNewChatResults] = useState([])

  // Filter conversations by search
  const filteredConvs = conversations.filter(conv => {
    const other = getOtherParticipant(conv)
    const name = conv.isGroup ? conv.groupName : other?.name || ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  const onlineCount = Math.max(0, onlineUsers.size - 1)

  // Search users for new chat
  useEffect(() => {
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        if (!newChatQuery.trim()) {
          const users = await userService.getOnlineUsers()
          setNewChatResults(users)
        } else {
          const users = await userService.searchUsers(newChatQuery)
          setNewChatResults(users)
        }
      } catch { toast.error('Failed to load users') }
      finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(timer)
  }, [newChatQuery, showNewChat])

  // Start new chat with a user
  const startNewChat = useCallback(async (targetUser) => {
    try {
      const conv = await chatService.getOrCreateConversation(targetUser._id)
      addConversation(conv)
      setActiveConversation(conv)
      setShowNewChat(false)
      setNewChatQuery('')
      setNewChatResults([])
    } catch { toast.error('Failed to start conversation') }
  }, [addConversation, setActiveConversation])

  const getConvDisplayData = (conv) => {
    if (conv.isGroup) {
      return {
        name: conv.groupName,
        avatar: conv.groupAvatar,
        status: 'online',
        lastMsg: conv.lastMessage?.text || 'Group created',
      }
    }
    const other = getOtherParticipant(conv)
    return {
      name: other?.name || 'Unknown',
      avatar: other?.avatar,
      status: onlineUsers.has(other?._id) ? 'online' : (other?.status || 'offline'),
      lastMsg: conv.lastMessage?.text
        || (conv.lastMessage?.type === 'image' ? '📷 Photo'
          : conv.lastMessage?.type === 'file' ? '📎 File' : 'Start chatting'),
    }
  }

  const formatTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex h-full w-full md:w-auto">
      {/* Icon Rail */}
      <div className="w-[60px] flex flex-col items-center py-4 gap-4 bg-bg-secondary border-r border-surface flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-glow mb-3 flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>

        {RAIL_ITEMS.map(item => {
          const isActive = location.pathname.startsWith(item.path)
          return (
            <button key={item.id} onClick={() => navigate(item.path)} title={item.label}
              className={cn(
                'relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group',
                isActive ? 'bg-accent-primary/10 text-accent-primary shadow-glow-green' : 'text-text-muted hover:bg-surface hover:text-accent-primary hover:scale-[1.05] hover:shadow-glow-green'
              )}>
              {isActive && (
                <motion.span layoutId="rail-indicator"
                  className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent-primary rounded-r-full" />
              )}
              <item.icon className="w-[22px] h-[22px] group-hover:scale-110 transition-transform duration-300" />
            </button>
          )
        })}

        <div className="flex-1" />

        <button onClick={toggleTheme} title="Toggle theme"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-text-muted hover:text-accent-primary hover:bg-surface hover:scale-[1.05] hover:shadow-glow-green transition-all duration-300">
          {theme === 'dark' ? <Sun className="w-[22px] h-[22px]" /> : <Moon className="w-[22px] h-[22px]" />}
        </button>
        <button onClick={() => navigate('/settings')} title="Settings"
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group',
            location.pathname.startsWith('/settings') ? 'bg-accent-primary/10 text-accent-primary shadow-glow-green' : 'text-text-muted hover:bg-surface hover:text-accent-primary hover:scale-[1.05] hover:shadow-glow-green'
          )}>
          <Settings className="w-[22px] h-[22px]" />
        </button>
        <button onClick={() => navigate('/profile')} title="Profile" className={cn('mt-2 relative hover:scale-105 hover:shadow-glow-green rounded-full transition-all duration-300', location.pathname.startsWith('/profile') ? 'shadow-glow-green scale-105 border-2 border-accent-primary' : '')}>
          <Avatar name={user?.name} src={user?.avatar} status="online" size="sm" />
        </button>
      </div>

      {/* Main Panel */}
      {['/chat', '/groups', '/starred'].some(p => location.pathname.startsWith(p)) && (
      <div className="flex-1 md:flex-none md:w-[280px] flex flex-col bg-bg-secondary border-r border-surface flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-surface">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-text-primary text-sm">
              {activeSection === 'chats' ? 'Messages' : activeSection === 'channels' ? 'Channels' : activeSection === 'contacts' ? 'Contacts' : 'Starred'}
            </h2>
            <div className="flex items-center gap-1">
              <button className="p-1.5 hover:bg-surface/5 rounded-lg text-text-faint hover:text-text-muted transition-colors">
                <Bell className="w-4 h-4" />
              </button>
              <button onClick={() => setShowNewChat(true)}
                className="p-1.5 hover:bg-surface/5 rounded-lg text-text-faint hover:text-accent-light transition-colors" title="New chat">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full bg-bg-primary border border-surface text-text-primary placeholder-text-muted rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 transition-all shadow-sm" />
          </div>
        </div>

        {/* Online count */}
        <div className="px-4 py-3 flex items-center gap-2 border-b border-surface/50">
          <span className="w-2.5 h-2.5 rounded-full bg-status-online animate-pulse-slow shadow-glow-green" />
          <span className="text-xs font-medium text-text-muted">{onlineCount} online</span>
        </div>

        {/* New Chat Modal */}
        <AnimatePresence>
          {showNewChat && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
              onClick={() => setShowNewChat(false)}>
              <motion.div initial={{ scale: 0.92, y: -10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92 }}
                className="glass-card rounded-2xl w-full max-w-sm border border-surface/10 shadow-card"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-surface/5">
                  <h3 className="font-semibold text-text-primary">New Conversation</h3>
                  <button onClick={() => setShowNewChat(false)} className="p-1 hover:bg-surface/10 rounded-lg text-text-muted">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="relative mb-3">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                    <input autoFocus value={newChatQuery} onChange={e => setNewChatQuery(e.target.value)}
                      placeholder="Search users by name or username…"
                      className="w-full input-field pl-9 text-sm" />
                  </div>
                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {searching && <p className="text-center text-text-faint text-sm py-4">Searching…</p>}
                    {!searching && newChatResults.map(u => (
                      <button key={u._id} onClick={() => startNewChat(u)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface/5 transition-colors text-left">
                        <Avatar name={u.name} src={u.avatar} size="sm"
                          status={onlineUsers.has(u._id) ? 'online' : u.status} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{u.name}</p>
                          <p className="text-xs text-text-faint truncate">@{u.username}</p>
                        </div>
                      </button>
                    ))}
                    {!searching && newChatQuery && newChatResults.length === 0 && (
                      <p className="text-center text-text-faint text-sm py-4">No users found</p>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {loadingConvs ? (
            <ChatListSkeleton />
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <UserPlus className="w-8 h-8 text-text-faint mb-2" />
              <p className="text-sm text-text-muted font-medium">No conversations yet</p>
              <p className="text-xs text-text-faint mt-1">Click + to start chatting</p>
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate">
              {filteredConvs.map(conv => {
                const { name, avatar, status, lastMsg } = getConvDisplayData(conv)
                return (
                  <motion.div key={conv._id} variants={staggerItem}
                    onClick={() => setActiveConversation(conv)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden group',
                      activeConversation?._id === conv._id
                        ? 'bg-bg-tertiary shadow-sm'
                        : 'hover:bg-bg-primary'
                    )}>
                    {activeConversation?._id === conv._id && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent-primary rounded-r-md" />
                    )}
                    <Avatar name={name} src={avatar} status={status} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={cn('text-sm font-semibold truncate',
                          activeConversation?._id === conv._id ? 'text-text-primary' : 'text-text-primary')}>
                          {name}
                        </span>
                        <span className="text-xs text-text-faint flex-shrink-0">
                          {formatTime(conv.updatedAt || conv.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted truncate">{lastMsg}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="badge flex-shrink-0">{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>
                    )}
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>

        {/* User Footer */}
        <div className="border-t border-surface/5 p-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Avatar name={user?.name} src={user?.avatar} status="online" size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
              <p className="text-xs text-text-faint truncate">@{user?.username}</p>
            </div>
            <button onClick={logout}
              className="p-1.5 text-text-faint hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

export default Sidebar
