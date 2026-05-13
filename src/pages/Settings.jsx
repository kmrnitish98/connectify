import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Bell, Moon, Sun, Shield, Headphones,
  Camera, Check, Loader2, ChevronRight
} from 'lucide-react'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { userService } from '../services/userService'
import toast from 'react-hot-toast'
import { cn } from '../utils/helpers'
import { staggerContainer, staggerItem } from '../animations/variants'

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Moon },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'audio', label: 'Audio & Video', icon: Headphones },
]

const Settings = () => {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [activeSection, setActiveSection] = useState('profile')
  const [saving, setSaving] = useState(false)
  const avatarInputRef = useRef(null)

  // Profile state
  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [status, setStatus] = useState(user?.status || 'online')
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null)
  const [avatarFile, setAvatarFile] = useState(null)

  // Notification toggles
  const [notifs, setNotifs] = useState({
    messages: true, calls: true, mentions: true, email: false, sound: true
  })

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('bio', bio.trim())
      formData.append('status', status)
      if (avatarFile) formData.append('avatar', avatarFile)

      const updated = await userService.updateProfile(formData)
      updateUser(updated)
      setAvatarFile(null)
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'profile': return (
        <div className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar name={name || user?.name} src={avatarPreview} size="2xl" />
              <button onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-accent-primary rounded-full flex items-center justify-center border-2 border-bg-card hover:bg-accent-hover transition-colors shadow-glow">
                <Camera className="w-4 h-4 text-white" />
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">{user?.name}</h3>
              <p className="text-text-muted text-sm">@{user?.username}</p>
              <p className="text-text-faint text-xs mt-0.5">{user?.email}</p>
              <button onClick={() => avatarInputRef.current?.click()}
                className="text-xs text-accent-light hover:text-accent-primary transition-colors mt-1">
                Change photo
              </button>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-muted mb-1.5">Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1.5">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                maxLength={160} placeholder="Tell people a little about yourself"
                className="input-field w-full resize-none" />
              <p className="text-xs text-text-faint mt-1 text-right">{bio.length}/160</p>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-2">Status</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'online', label: 'Online', color: 'bg-status-online' },
                  { value: 'away', label: 'Away', color: 'bg-status-away' },
                  { value: 'busy', label: 'Busy', color: 'bg-status-busy' },
                  { value: 'offline', label: 'Invisible', color: 'bg-status-offline' },
                ].map(s => (
                  <button key={s.value} onClick={() => setStatus(s.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all',
                      status === s.value ? 'border-accent-primary bg-accent-primary/10 text-text-primary' : 'border-surface/10 hover:border-surface/20 text-text-muted'
                    )}>
                    <span className={`w-2 h-2 rounded-full ${s.color}`} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={saveProfile} variant="primary" isLoading={saving}
            leftIcon={saving ? null : <Check className="w-4 h-4" />}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )

      case 'notifications': return (
        <div className="space-y-3">
          {Object.entries(notifs).map(([key, val]) => {
            const labels = { messages: 'New Messages', calls: 'Incoming Calls', mentions: 'Mentions & Replies', email: 'Email Notifications', sound: 'Sound Effects' }
            const descs = { messages: 'Get notified when you receive a new message', calls: 'Get notified when someone calls you', mentions: 'Get notified when someone mentions you', email: 'Receive weekly digest and important alerts', sound: 'Play sounds for messages and calls' }
            return (
              <div key={key} className="flex items-center justify-between p-4 glass-card rounded-xl">
                <div>
                  <p className="text-sm font-medium text-text-primary">{labels[key]}</p>
                  <p className="text-xs text-text-faint mt-0.5">{descs[key]}</p>
                </div>
                <button onClick={() => setNotifs(prev => ({ ...prev, [key]: !val }))}
                  className={cn('w-11 h-6 rounded-full transition-all duration-300 relative flex-shrink-0',
                    val ? 'bg-accent-primary' : 'bg-surface/10')}>
                  <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300',
                    val ? 'left-5' : 'left-0.5')} />
                </button>
              </div>
            )
          })}
        </div>
      )

      case 'appearance': return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 glass-card rounded-xl">
            <div>
              <p className="text-sm font-medium text-text-primary">Dark Mode</p>
              <p className="text-xs text-text-faint mt-0.5">Switch between dark and light theme</p>
            </div>
            <button onClick={toggleTheme}
              className={cn('w-11 h-6 rounded-full transition-all duration-300 relative',
                theme === 'dark' ? 'bg-accent-primary' : 'bg-surface/10')}>
              <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300',
                theme === 'dark' ? 'left-5' : 'left-0.5')} />
            </button>
          </div>
          <div className="p-4 glass-card rounded-xl">
            <p className="text-sm font-medium text-text-primary mb-3">Accent Color</p>
            <div className="flex gap-3">
              {['#6366F1', '#8B5CF6', '#EC4899', '#06B6D4', '#22C55E', '#F59E0B'].map(color => (
                <button key={color} className="w-8 h-8 rounded-full border-2 border-transparent hover:border-surface/40 transition-all"
                  style={{ background: color }} />
              ))}
            </div>
          </div>
        </div>
      )

      case 'privacy': return (
        <div className="space-y-4">
          {[
            { label: 'Last Seen', desc: 'Show when you were last active', options: ['Everyone', 'Contacts', 'Nobody'] },
            { label: 'Read Receipts', desc: 'Let others know when you\'ve read their messages', options: ['On', 'Off'] },
            { label: 'Profile Photo', desc: 'Who can see your profile photo', options: ['Everyone', 'Contacts', 'Nobody'] },
          ].map(item => (
            <div key={item.label} className="p-4 glass-card rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">{item.label}</p>
                  <p className="text-xs text-text-faint mt-0.5">{item.desc}</p>
                </div>
                <select className="bg-bg-tertiary border border-surface/10 rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary/40">
                  {item.options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          ))}
          <div className="p-4 glass-card rounded-xl border border-red-500/20">
            <p className="text-sm font-semibold text-red-400 mb-1">Danger Zone</p>
            <p className="text-xs text-text-faint mb-3">Permanently delete your account and all data</p>
            <button className="text-sm text-red-400 hover:text-red-300 transition-colors">Delete Account</button>
          </div>
        </div>
      )

      case 'audio': return (
        <div className="space-y-4">
          {[
            { label: 'Microphone', desc: 'Select your default microphone for calls' },
            { label: 'Camera', desc: 'Select your default camera for video calls' },
            { label: 'Speaker', desc: 'Select your output device for audio' },
          ].map(item => (
            <div key={item.label} className="p-4 glass-card rounded-xl">
              <p className="text-sm font-medium text-text-primary mb-1">{item.label}</p>
              <p className="text-xs text-text-faint mb-2">{item.desc}</p>
              <select className="w-full bg-bg-tertiary border border-surface/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary/40">
                <option>Default — System Device</option>
              </select>
            </div>
          ))}
        </div>
      )

      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface/5 rounded-xl text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0 hidden sm:block">
            <nav className="space-y-1">
              {SECTIONS.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    activeSection === s.id ? 'bg-accent-primary/10 text-accent-light border border-accent-primary/20' : 'text-text-muted hover:bg-surface/5 hover:text-text-primary'
                  )}>
                  <s.icon className="w-4 h-4 flex-shrink-0" />
                  {s.label}
                </button>
              ))}
              <button onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all mt-4">
                <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                Sign out
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 glass-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-6">
              {SECTIONS.find(s => s.id === activeSection)?.label}
            </h2>
            <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {renderContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
