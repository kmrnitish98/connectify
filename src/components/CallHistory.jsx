import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Phone, Video, PhoneMissed, PhoneOutgoing, PhoneIncoming, Search } from 'lucide-react'
import Avatar from './Avatar'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { cn } from '../utils/helpers'

const CallHistory = () => {
  const { user } = useAuth()
  const [calls, setCalls] = useState([])
  const [filter, setFilter] = useState('all') // all, missed, video, audio
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const { data } = await api.get('/calls')
        setCalls(data)
      } catch (err) {
        toast.error('Failed to load call history')
      } finally {
        setLoading(false)
      }
    }
    fetchCalls()
  }, [])

  const filteredCalls = calls.filter(call => {
    if (filter === 'missed') return call.status === 'missed' || call.status === 'rejected'
    if (filter === 'video') return call.callType === 'video'
    if (filter === 'audio') return call.callType === 'audio'
    return true
  })

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-primary overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-surface flex-shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Call History</h2>
          <p className="text-sm text-text-muted mt-1">View your recent voice and video calls</p>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 flex items-center gap-2 border-b border-surface/50 overflow-x-auto flex-shrink-0">
        {['all', 'missed', 'video', 'audio'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize whitespace-nowrap',
              filter === f
                ? 'bg-accent-primary text-white shadow-glow-green'
                : 'bg-surface/10 text-text-muted hover:bg-surface/20 hover:text-text-primary'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-2xl bg-surface/5 border border-surface/10">
                <div className="w-12 h-12 rounded-full bg-surface/20" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface/20 rounded w-1/4" />
                  <div className="h-3 bg-surface/20 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-surface/10 rounded-full flex items-center justify-center mb-4">
              <Phone className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-medium text-text-primary">No calls found</h3>
            <p className="text-sm text-text-muted mt-1">
              {filter === 'all' ? "You haven't made any calls yet." : `No ${filter} calls found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCalls.map((call) => {
              const isCaller = call.caller._id === user?._id
              const otherUser = isCaller ? call.receiver : call.caller
              const isMissed = call.status === 'missed' || call.status === 'rejected'
              
              const StatusIcon = isMissed ? PhoneMissed : (isCaller ? PhoneOutgoing : PhoneIncoming)
              const statusColor = isMissed ? 'text-red-400' : 'text-accent-primary'
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={call._id}
                  className="flex items-center justify-between p-4 rounded-2xl hover:bg-surface/5 border border-transparent hover:border-surface/10 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={otherUser.name} src={otherUser.avatar} size="lg" />
                    <div>
                      <h4 className={cn('font-medium text-[15px]', isMissed ? 'text-red-400' : 'text-text-primary')}>
                        {otherUser.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                        <StatusIcon className={cn('w-3.5 h-3.5', statusColor)} />
                        <span>{formatTime(call.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-text-primary capitalize">{call.callType}</p>
                      <p className="text-xs text-text-faint">{isMissed ? 'Missed' : formatDuration(call.duration)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-surface/10 flex items-center justify-center text-text-muted group-hover:bg-accent-primary group-hover:text-white transition-colors cursor-pointer">
                      {call.callType === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default CallHistory
