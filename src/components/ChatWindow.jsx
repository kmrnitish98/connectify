import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Smile, Paperclip, Mic, Phone, Video, MoreVertical,
  Search, Image as ImageIcon, X, Reply, Trash2, Edit3,
  Check, CheckCheck, StopCircle, File, Download, ChevronDown, ArrowLeft
} from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import Avatar from './Avatar'
import { useChat } from '../context/ChatContext'
import { useAuth } from '../context/AuthContext'
import { useCall } from '../context/CallContext'
import useUpload from '../hooks/useUpload'
import { cn, formatFileSize } from '../utils/helpers'
import { chatService } from '../services/chatService'
import toast from 'react-hot-toast'

// ─── Typing Indicator ──────────────────────────────────────────
const TypingIndicator = ({ users }) => {
  const names = Object.values(users).map(u => u?.name?.split(' ')[0]).filter(Boolean)
  if (!names.length) return null
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex items-center gap-2 px-4 py-1.5">
      <div className="flex gap-1 bg-bg-tertiary px-3 py-2 rounded-2xl rounded-bl-sm">
        {[0,1,2].map(i => (
          <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
      <span className="text-xs text-text-faint">{names.join(', ')} typing…</span>
    </motion.div>
  )
}

// ─── Message Status ─────────────────────────────────────────────
const MessageStatus = ({ msg, currentUserId }) => {
  if (msg.sender?._id !== currentUserId) return null
  const readCount = (msg.readBy || []).filter(id => id !== currentUserId).length
  if (readCount > 0) return <CheckCheck className="w-3 h-3 text-status-online flex-shrink-0" />
  if (msg._id) return <CheckCheck className="w-3 h-3 text-text-faint flex-shrink-0" />
  return <Check className="w-3 h-3 text-text-faint flex-shrink-0" />
}

// ─── Image Message ──────────────────────────────────────────────
const ImageMessage = ({ msg, isMine }) => (
  <div className="max-w-xs">
    <img
      src={msg.fileUrl}
      alt={msg.fileName || 'Image'}
      className="rounded-xl w-full max-w-xs cursor-pointer hover:opacity-90 transition-opacity"
      onClick={() => window.open(msg.fileUrl, '_blank')}
      onError={e => { e.target.style.display = 'none' }}
    />
    {msg.text && <p className={cn('text-sm mt-1.5', isMine ? 'text-white/90' : 'text-text-primary')}>{msg.text}</p>}
  </div>
)

// ─── File Message ───────────────────────────────────────────────
const FileMessage = ({ msg, isMine }) => (
  <div className={cn(
    'flex items-center gap-3 px-4 py-3 rounded-xl border max-w-xs',
    isMine ? 'bg-surface/10 border-surface/20' : 'bg-bg-primary border-surface/10'
  )}>
    <div className="w-9 h-9 rounded-lg bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
      <File className="w-4 h-4 text-accent-light" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{msg.fileName || 'File'}</p>
      {msg.fileSize && <p className="text-xs text-text-faint mt-0.5">{formatFileSize(msg.fileSize)}</p>}
    </div>
    <a href={msg.fileUrl} download target="_blank" rel="noopener noreferrer"
      className="p-1.5 hover:bg-surface/10 rounded-lg transition-colors flex-shrink-0">
      <Download className="w-4 h-4" />
    </a>
  </div>
)

// ─── Call Message ───────────────────────────────────────────────
const CallMessage = ({ msg, isMine }) => {
  const isMissed = msg.callData?.status === 'missed' || msg.callData?.status === 'rejected'
  const Icon = msg.callData?.type === 'video' ? Video : Phone
  
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-2.5 rounded-xl border max-w-xs',
      isMissed ? 'bg-red-500/10 border-red-500/20' : isMine ? 'bg-surface/10 border-surface/20' : 'bg-bg-primary border-surface/10'
    )}>
      <div className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
        isMissed ? 'bg-red-500/20 text-red-400' : 'bg-accent-primary/20 text-accent-light'
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <p className={cn('text-sm font-medium truncate', isMissed ? 'text-red-400' : 'text-text-primary')}>
          {isMissed ? `Missed ${msg.callData?.type} call` : `${msg.callData?.type} call`}
        </p>
        <p className="text-xs text-text-faint mt-0.5">
          {msg.callData?.duration ? `${formatDuration(msg.callData.duration)}` : isMissed ? 'Missed' : 'Ended'}
        </p>
      </div>
    </div>
  )
}

const formatDuration = (seconds) => {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ─── Single Message Bubble ─────────────────────────────────────
const MessageBubble = ({ msg, isMine, contact, onReply, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setShowMenu(false) }
    if (showMenu) document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showMenu])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-end gap-2 group mb-3', isMine ? 'flex-row-reverse' : 'flex-row')}
    >
      {!isMine && <Avatar name={contact?.name} src={contact?.avatar} size="sm" className="mb-1 flex-shrink-0" />}

      <div className={cn('relative flex flex-col max-w-[70%]', isMine ? 'items-end' : 'items-start')}>
        {/* Reply preview */}
        {msg.replyTo && (
          <div className={cn(
            'text-xs mb-1 px-3 py-1.5 rounded-lg border-l-2 max-w-full',
            isMine ? 'bg-surface/10 border-surface/30 text-white/70' : 'bg-surface/5 border-accent-primary text-text-muted'
          )}>
            <p className="font-medium text-accent-light text-xs">{msg.replyTo.sender?.name}</p>
            <p className="truncate">{msg.replyTo.text || (msg.replyTo.type === 'image' ? '📷 Photo' : '📎 File')}</p>
          </div>
        )}

        {/* Bubble */}
        <div className={cn(
          'relative px-4 py-2.5 rounded-[18px] text-sm leading-relaxed shadow-sm transition-all duration-300 hover:shadow-md',
          msg.type === 'call' ? 'p-0 bg-transparent border-0 shadow-none hover:shadow-none' :
          isMine ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-br-sm shadow-glow-green' : 'bg-bg-secondary text-text-primary rounded-bl-sm border border-surface'
        )}>
          {msg.type === 'image' ? <ImageMessage msg={msg} isMine={isMine} />
            : msg.type === 'file' ? <FileMessage msg={msg} isMine={isMine} />
            : msg.type === 'call' ? <CallMessage msg={msg} isMine={isMine} />
            : <p className="break-words whitespace-pre-wrap">{msg.text}</p>}

          {msg.edited && (
            <span className={cn('text-xs ml-1', isMine ? 'text-white/50' : 'text-text-faint')}>
              (edited)
            </span>
          )}

          {/* Context menu toggle */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={cn(
              'absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/20',
              isMine ? '-left-7' : '-right-7'
            )}
          >
            <MoreVertical className="w-3.5 h-3.5 text-text-muted" />
          </button>
        </div>

        {/* Timestamp + status */}
        <div className={cn('flex items-center gap-1 mt-0.5 px-1', isMine ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-xs text-text-faint">
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <MessageStatus msg={msg} currentUserId={msg.sender?._id} />
        </div>

        {/* Context Menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                'absolute top-8 z-20 glass-card rounded-xl py-1 min-w-[140px] shadow-card border border-surface/10',
                isMine ? 'right-0' : 'left-0'
              )}
            >
              <button onClick={() => { onReply(msg); setShowMenu(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-muted hover:bg-surface/5 hover:text-text-primary transition-colors">
                <Reply className="w-3.5 h-3.5" /> Reply
              </button>
              {isMine && msg.type === 'text' && (
                <button onClick={() => { onEdit(msg); setShowMenu(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-muted hover:bg-surface/5 hover:text-text-primary transition-colors">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
              <button onClick={() => { onDelete(msg._id); setShowMenu(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── Upload Progress ────────────────────────────────────────────
const UploadProgress = ({ progress, filename }) => (
  <div className="mx-4 mb-2 bg-bg-tertiary rounded-xl p-3 flex items-center gap-3">
    <div className="flex-1">
      <p className="text-xs text-text-muted mb-1 truncate">{filename}</p>
      <div className="h-1.5 bg-surface/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-accent-primary rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: 'linear' }}
        />
      </div>
    </div>
    <span className="text-xs text-text-faint flex-shrink-0">{progress}%</span>
  </div>
)

// ─── Main ChatWindow ────────────────────────────────────────────
const ChatWindow = () => {
  const { activeConversation, messages, typingUsers, sendMessage, startTyping, stopTyping,
    updateMessageLocally, removeMessageLocally, getOtherParticipant, setActiveConversation } = useChat()
  const { user } = useAuth()
  const { startCall } = useCall()
  const { uploadImage, uploadFile, progress, uploading, error: uploadError } = useUpload()

  const [input, setInput] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [editingMsg, setEditingMsg] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const typingRef = useRef(false)

  const conversationId = activeConversation?._id
  const chatMessages = conversationId ? (messages[conversationId] || []) : []
  const contact = getOtherParticipant(activeConversation)
  const convTypingUsers = typingUsers[conversationId] || {}
  const isTyping = Object.keys(convTypingUsers).length > 0

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    scrollToBottom('instant')
  }, [conversationId])

  useEffect(() => {
    if (chatMessages.length > 0) scrollToBottom()
  }, [chatMessages.length])

  const handleScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200)
  }

  // Typing events
  const handleInputChange = (e) => {
    setInput(e.target.value)
    if (!conversationId) return
    if (!typingRef.current) {
      typingRef.current = true
      startTyping(conversationId)
    }
    clearTimeout(typingRef.stopTimeout)
    typingRef.stopTimeout = setTimeout(() => {
      typingRef.current = false
      stopTyping(conversationId)
    }, 2000)
  }

  // Send text message
  const handleSend = async () => {
    const text = input.trim()
    if (!text || !conversationId) return
    setInput('')
    stopTyping(conversationId)
    typingRef.current = false
    if (editingMsg) {
      // Edit mode
      try {
        await chatService.editMessage(editingMsg._id, text)
        updateMessageLocally(conversationId, editingMsg._id, { text, edited: true })
        setEditingMsg(null)
      } catch { toast.error('Failed to edit message') }
      return
    }
    try {
      await sendMessage(conversationId, {
        text,
        type: 'text',
        replyTo: replyTo?._id || null,
      })
      setReplyTo(null)
    } catch { toast.error('Failed to send message') }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') { setReplyTo(null); setEditingMsg(null) }
  }

  // Image upload + send
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !conversationId) return
    setUploadingFile(file.name)
    try {
      const result = await uploadImage(file)
      if (result) {
        await sendMessage(conversationId, {
          type: 'image',
          fileUrl: result.url,
          filePublicId: result.publicId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          text: '',
        })
      }
    } catch { toast.error('Failed to upload image') }
    finally { setUploadingFile(null); e.target.value = '' }
  }

  // File upload + send
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !conversationId) return
    setUploadingFile(file.name)
    try {
      const result = await uploadFile(file)
      if (result) {
        await sendMessage(conversationId, {
          type: 'file',
          fileUrl: result.url,
          filePublicId: result.publicId,
          fileName: result.originalName || file.name,
          fileSize: file.size,
          mimeType: file.type,
          text: '',
        })
      }
    } catch { toast.error('Failed to upload file') }
    finally { setUploadingFile(null); e.target.value = '' }
  }

  // Delete message
  const handleDelete = async (messageId) => {
    try {
      await chatService.deleteMessage(messageId)
      removeMessageLocally(conversationId, messageId)
    } catch { toast.error('Failed to delete message') }
  }

  // Edit message
  const handleEdit = (msg) => {
    setEditingMsg(msg)
    setInput(msg.text)
    setReplyTo(null)
    inputRef.current?.focus()
  }

  // Emoji select
  const onEmojiClick = (emojiData) => {
    setInput(prev => prev + emojiData.emoji)
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  // Empty state
  if (!activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-5 bg-bg-primary">
        <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 3, repeat: Infinity }}>
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center border border-surface/5">
            <Send className="w-10 h-10 text-accent-primary/60" />
          </div>
        </motion.div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-text-primary mb-2">Start a conversation</h3>
          <p className="text-text-muted text-sm">Select a chat from the sidebar or search for someone</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface bg-bg-primary/80 backdrop-blur-[16px] sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveConversation(null)}
            className="md:hidden p-2 -ml-2 hover:bg-surface rounded-full text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Avatar name={contact?.name} src={contact?.avatar} status={contact?.status} size="md" />
          <div>
            <h3 className="font-semibold text-text-primary text-sm leading-tight">
              {activeConversation.isGroup ? activeConversation.groupName : contact?.name}
            </h3>
            <p className="text-xs text-text-muted">
              {isTyping ? (
                <span className="text-accent-primary font-medium">typing…</span>
              ) : contact?.status === 'online' ? (
                <span className="text-accent-primary capitalize">online</span>
              ) : contact?.lastSeen ? (
                `last seen ${(() => {
                  const d = new Date(contact.lastSeen)
                  const now = new Date()
                  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  return isToday ? `today at ${time}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${time}`
                })()}`
              ) : (
                <span className="capitalize">{contact?.status || 'offline'}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2.5 hover:bg-surface hover:text-accent-primary rounded-full text-text-muted transition-all duration-300 group" title="Search in chat">
            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={() => startCall(contact?._id, 'audio', activeConversation?._id, contact)}
            className="p-2.5 hover:bg-surface hover:text-accent-primary rounded-full text-text-muted transition-all duration-300 group" title="Voice call">
            <Phone className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={() => startCall(contact?._id, 'video', activeConversation?._id, contact)}
            className="p-2.5 hover:bg-surface hover:text-accent-primary rounded-full text-text-muted transition-all duration-300 group" title="Video call">
            <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          <button className="p-2.5 hover:bg-surface hover:text-accent-primary rounded-full text-text-muted transition-all duration-300 group">
            <MoreVertical className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-2 relative bg-bg-primary"
        style={{ backgroundImage: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.03) 0%, transparent 70%)' }}>
        {chatMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center mx-auto mb-3">
                <Avatar name={contact?.name} src={contact?.avatar} size="lg" />
              </div>
              <p className="text-text-primary font-medium">{contact?.name}</p>
              <p className="text-text-faint text-sm mt-1">Send a message to start the conversation</p>
            </div>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <MessageBubble
              key={msg._id || msg.tempId}
              msg={msg}
              isMine={msg.sender?._id === user?._id || msg.sender === user?._id}
              contact={contact}
              onReply={setReplyTo}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}

        <AnimatePresence>
          {isTyping && <TypingIndicator users={convTypingUsers} />}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-24 right-6 w-9 h-9 bg-bg-tertiary border border-surface/10 rounded-full flex items-center justify-center shadow-card hover:bg-surface/10 transition-colors z-10"
          >
            <ChevronDown className="w-4 h-4 text-text-muted" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Upload progress */}
      <AnimatePresence>
        {uploading && <UploadProgress progress={progress} filename={uploadingFile} />}
      </AnimatePresence>

      {/* Reply / Edit banner */}
      <AnimatePresence>
        {(replyTo || editingMsg) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="mx-4 mb-1 px-3 py-2 bg-bg-tertiary rounded-xl border-l-2 border-accent-primary flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-accent-light font-medium">
                {editingMsg ? 'Editing message' : `Replying to ${replyTo?.sender?.name}`}
              </p>
              <p className="text-xs text-text-muted truncate">
                {editingMsg?.text || replyTo?.text || (replyTo?.type === 'image' ? '📷 Photo' : '📎 File')}
              </p>
            </div>
            <button onClick={() => { setReplyTo(null); setEditingMsg(null); setInput('') }}
              className="p-1 hover:bg-surface/10 rounded text-text-faint ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute bottom-20 left-4 z-30 shadow-card rounded-xl overflow-hidden">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme="dark"
              width={320}
              height={380}
              searchPlaceholder="Search emoji..."
              lazyLoadEmojis
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 bg-transparent flex-shrink-0 relative">
        <div className="flex items-end gap-3 max-w-4xl mx-auto bg-bg-secondary rounded-full shadow-card border border-surface px-2 py-1.5 backdrop-blur-[16px]">
          <button onClick={() => setShowEmoji(!showEmoji)}
            className="p-2.5 text-text-muted hover:text-accent-primary hover:bg-surface rounded-full transition-all duration-300 flex-shrink-0" title="Emoji">
            <Smile className="w-[22px] h-[22px]" />
          </button>

          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={editingMsg ? 'Edit message...' : 'Type a message...'}
            className="flex-1 bg-transparent text-text-primary placeholder-text-muted resize-none text-[15px] focus:outline-none py-2.5 max-h-32 my-auto"
            style={{ height: 'auto', minHeight: '44px' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px' }}
          />

          <div className="flex items-center gap-1 my-auto flex-shrink-0 mr-1">
            {/* Hidden file inputs */}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

            <button onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-text-muted hover:text-accent-primary hover:bg-surface rounded-full transition-all duration-300" title="Attach file">
              <Paperclip className="w-[22px] h-[22px]" />
            </button>
            <button onClick={() => imageInputRef.current?.click()}
              className="p-2.5 text-text-muted hover:text-accent-primary hover:bg-surface rounded-full transition-all duration-300" title="Send image">
              <ImageIcon className="w-[22px] h-[22px]" />
            </button>
            
            <motion.button
              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!input.trim() && !uploading}
              className={cn(
                'w-11 h-11 rounded-full transition-all duration-300 flex items-center justify-center flex-shrink-0 shadow-glow-green',
                input.trim()
                  ? 'bg-gradient-to-tr from-accent-primary to-accent-secondary text-white'
                  : 'bg-surface text-text-muted cursor-not-allowed shadow-none'
              )}
            >
              <Send className="w-5 h-5 ml-0.5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Click outside to close emoji */}
      {showEmoji && (
        <div className="fixed inset-0 z-20" onClick={() => setShowEmoji(false)} />
      )}
    </div>
  )
}

export default ChatWindow
