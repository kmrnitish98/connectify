import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit3, Camera, MessageSquare, Video, Phone,
  Calendar, Users
} from 'lucide-react'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import { useAuth } from '../context/AuthContext'
import { staggerContainer, staggerItem } from '../animations/variants'
import { useChat } from '../context/ChatContext'

const Profile = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { conversations, getOtherParticipant, onlineUsers } = useChat()

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })
    : 'Recently'

  const stats = [
    { label: 'Conversations', value: conversations.length.toString() },
    { label: 'Connections', value: conversations.length.toString() },
    { label: 'Status', value: user?.status || 'online' },
    { label: 'Member Since', value: joinedDate },
  ]

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface/5 rounded-xl text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>

        {/* Cover + Avatar */}
        <div className="glass-card rounded-2xl overflow-hidden mb-6">
          {/* Cover gradient */}
          <div className="h-40 bg-gradient-to-r from-accent-primary/40 via-accent-secondary/40 to-pink-500/40 relative">
            <div className="absolute inset-0 gradient-bg opacity-20" />
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              <div className="relative">
                <Avatar name={user?.name} size="2xl" className="border-4 border-bg-card" />
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-accent-primary rounded-full flex items-center justify-center hover:bg-accent-hover transition-colors border-2 border-bg-card">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="flex gap-3 pb-1">
                <Button variant="ghost" onClick={() => navigate('/settings')} leftIcon={<Edit3 className="w-4 h-4" />}>
                  Edit Profile
                </Button>
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-2xl font-bold text-text-primary">{user?.name}</h2>
              <p className="text-text-muted">@{user?.username}</p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-text-faint">
              {user?.bio && <p className="text-text-muted text-sm mb-2 max-w-md leading-relaxed w-full">{user.bio}</p>}
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />Joined {joinedDate}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {stats.map(s => (
            <div key={s.label} className="glass-card rounded-xl p-4 text-center">
              <p className="text-2xl font-bold gradient-text">{s.value}</p>
              <p className="text-text-faint text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex gap-3 mb-6">
          <Button variant="primary" leftIcon={<MessageSquare className="w-4 h-4" />} onClick={() => navigate('/home')}>Message</Button>
          <Button variant="secondary" leftIcon={<Video className="w-4 h-4" />}>Video Call</Button>
          <Button variant="secondary" leftIcon={<Phone className="w-4 h-4" />}>Voice Call</Button>
        </div>

        {/* Recent Contacts */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-light" />
            Connections
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {conversations.slice(0, 6).map(conv => {
              const other = getOtherParticipant(conv)
              if (!other) return null
              return (
                <div key={conv._id}
                  onClick={() => navigate('/home')}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface/5 transition-colors cursor-pointer">
                  <Avatar name={other.name} src={other.avatar}
                    status={onlineUsers.has(other._id) ? 'online' : other.status} size="sm" />
                  <div className="min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">{other.name}</p>
                    <p className="text-text-faint text-xs capitalize">
                      {onlineUsers.has(other._id) ? 'online' : other.status || 'offline'}
                    </p>
                  </div>
                </div>
              )
            })}
            {conversations.length === 0 && (
              <p className="text-text-faint text-sm col-span-3">No connections yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
