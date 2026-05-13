/**
 * VideoCallRoom.jsx — Production-ready calling UI
 *
 * Key improvements:
 * - Shows correct state labels: Calling → Ringing → Connecting → Connected
 * - Audio call uses a clean avatar-centric layout (no blank black screen)
 * - Video PiP only shown for video calls
 * - Screen-share and video toggle only for video calls
 * - Proper srcObject attachment via useEffect (avoids null-ref race condition)
 * - contactInfo (outgoing) vs callerInfo (incoming) correctly separated
 * - Toast notifications for missed / rejected / ended calls
 */
import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Video, VideoOff, Monitor, Phone, Maximize2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Avatar from './Avatar'
import { useCall } from '../context/CallContext'
import { cn } from '../utils/helpers'

// ─── Helpers ──────────────────────────────────────────────────
const formatDuration = (s) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

const STATE_LABEL = {
  calling: 'Calling…',
  ringing: 'Ringing…',
  connecting: 'Connecting…',
  connected: 'Connected',
}

// ─── Pulsing ring animation behind an avatar ─────────────────
const PulseAvatar = ({ name, src, pulse = true, size = '2xl' }) => (
  <div className="relative flex items-center justify-center">
    {pulse && [1, 2, 3].map(i => (
      <motion.div key={i}
        animate={{ scale: [1, 1.5 + i * 0.2], opacity: [0.35, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.45, ease: 'easeOut' }}
        className="absolute inset-0 rounded-full border-2 border-accent-primary"
      />
    ))}
    <Avatar name={name} src={src} size={size} className="relative z-10" />
  </div>
)

// ─── Control button ───────────────────────────────────────────
const ControlBtn = ({ icon: Icon, active, onClick, label, danger = false }) => (
  <motion.button
    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
    onClick={onClick} title={label}
    className={cn(
      'flex flex-col items-center justify-center gap-1',
      'w-14 h-14 rounded-full transition-all duration-200',
      active && !danger && 'bg-red-500/20 text-red-400 border border-red-500/30',
      !active && !danger && 'bg-white/10 text-white hover:bg-white/20',
      danger && 'bg-red-500 hover:bg-red-600 text-white shadow-lg',
    )}
  >
    <Icon className="w-5 h-5" />
    <span className="text-[9px] font-medium opacity-70 leading-none">{label}</span>
  </motion.button>
)

// ─── Main Component ───────────────────────────────────────────
const VideoCallRoom = () => {
  const {
    callState, callerInfo, contactInfo, callType,
    isMuted, isVideoOff, callDuration,
    localVideoRef, remoteVideoRef,
    localStream, remoteStream,
    acceptCall, rejectCall, endCall,
    toggleMute, toggleVideo, toggleScreenShare,
  } = useCall()

  // Attach streams to video elements as soon as refs + streams are both ready
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, callState, localVideoRef])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream, callState, remoteVideoRef])

  // Decide whose info to show (incoming = callerInfo, outgoing = contactInfo)
  const displayInfo = callState === 'incoming' ? callerInfo : (contactInfo || callerInfo)
  const isAudio = callType === 'audio'
  const stateLabel = STATE_LABEL[callState] ?? ''

  // ── Nothing to render while idle ──
  if (callState === 'idle') return null

  // ── Incoming call notification card ────────────────────────
  if (callState === 'incoming') {
    return (
      <AnimatePresence>
        <motion.div
          key="incoming"
          initial={{ opacity: 0, y: 60, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-lg"
        >
          <div className="glass-card rounded-3xl p-10 w-80 text-center border border-white/10 shadow-2xl">
            {/* Call type badge */}
            <span className="inline-block px-3 py-0.5 rounded-full bg-accent-primary/20 text-accent-light text-xs font-semibold mb-4 uppercase tracking-widest">
              {isAudio ? '🎙 Audio Call' : '📹 Video Call'}
            </span>

            {/* Avatar with ring */}
            <div className="flex justify-center mb-5">
              <PulseAvatar name={callerInfo?.name} src={callerInfo?.avatar} />
            </div>

            <h3 className="text-2xl font-bold text-white mb-1">{callerInfo?.name}</h3>
            <p className="text-text-faint text-sm mb-8">Incoming {isAudio ? 'audio' : 'video'} call</p>

            {/* Decline / Accept */}
            <div className="flex items-center justify-center gap-10">
              <div className="flex flex-col items-center gap-2">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={rejectCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors"
                >
                  <Phone className="w-7 h-7 text-white rotate-[135deg]" />
                </motion.button>
                <span className="text-text-faint text-xs">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={acceptCall}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg transition-colors"
                >
                  <Phone className="w-7 h-7 text-white" />
                </motion.button>
                <span className="text-text-faint text-xs">Accept</span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // ── Active call screen ──────────────────────────────────────
  return (
    <motion.div
      key="active-call"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#080810] flex flex-col overflow-hidden"
    >
      {/* ── Main area ── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Remote video — hidden for audio calls or before stream arrives */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            (isAudio || !remoteStream) && 'hidden',
          )}
        />

        {/* Avatar overlay — shown for audio calls OR before video stream */}
        {(isAudio || !remoteStream) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#0d0d1a] to-[#080810]">
            <PulseAvatar
              name={displayInfo?.name || 'Unknown'}
              src={displayInfo?.avatar}
              pulse={callState !== 'connected'}
              size="2xl"
            />
            <h2 className="mt-6 text-2xl font-bold text-white">{displayInfo?.name || 'Unknown'}</h2>
            <p className="mt-2 text-accent-light/80 text-sm font-medium tracking-wide">{stateLabel}</p>
            {callState === 'connected' && (
              <p className="mt-1 text-white/40 text-xs font-mono">{formatDuration(callDuration)}</p>
            )}
          </div>
        )}

        {/* Local PiP — only for video calls */}
        {!isAudio && (
          <div className="absolute top-4 right-3 sm:right-4 w-24 h-16 sm:w-32 sm:h-20 md:w-40 md:h-24 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl bg-black z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={cn('w-full h-full object-cover', isVideoOff && 'invisible')}
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                <VideoOff className="w-5 h-5 text-white/40" />
              </div>
            )}
          </div>
        )}

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between px-3 sm:px-5 pt-4 sm:pt-5 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <div>
            <p className="text-white font-semibold text-sm leading-tight">
              {displayInfo?.name || (isAudio ? 'Audio Call' : 'Video Call')}
            </p>
            {callState === 'connected' && !isAudio && (
              <p className="text-white/50 text-xs font-mono mt-0.5">{formatDuration(callDuration)}</p>
            )}
            {callState !== 'connected' && (
              <p className="text-accent-light/70 text-xs mt-0.5">{stateLabel}</p>
            )}
          </div>
          {/* Placeholder for future maximize */}
          <button className="pointer-events-auto p-2 text-white/40 hover:text-white rounded-lg transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div className="relative z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex items-center justify-center gap-3 sm:gap-5 pt-4 sm:pt-6 pb-8 sm:pb-10 flex-wrap">
        <ControlBtn
          icon={isMuted ? MicOff : Mic}
          active={isMuted}
          onClick={toggleMute}
          label={isMuted ? 'Unmute' : 'Mute'}
        />

        {!isAudio && (
          <>
            <ControlBtn
              icon={isVideoOff ? VideoOff : Video}
              active={isVideoOff}
              onClick={toggleVideo}
              label={isVideoOff ? 'Cam On' : 'Cam Off'}
            />
            <ControlBtn
              icon={Monitor}
              onClick={toggleScreenShare}
              label="Share"
            />
          </>
        )}

        <ControlBtn
          icon={Phone}
          danger
          onClick={() => endCall()}
          label="End"
        />
      </div>
    </motion.div>
  )
}

export default VideoCallRoom
