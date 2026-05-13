import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Video, VideoOff, Monitor, Phone,
  Users, MessageSquare, MoreVertical, Maximize2, X
} from 'lucide-react'
import Avatar from './Avatar'
import { useCall } from '../context/CallContext'
import { cn } from '../utils/helpers'

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const VideoCallRoom = () => {
  const {
    callState, callerInfo, callType, isMuted, isVideoOff, callDuration,
    localVideoRef, remoteVideoRef,
    acceptCall, rejectCall, endCall, toggleMute, toggleVideo, toggleScreenShare,
    remoteStream, localStream,
  } = useCall()

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, localVideoRef, callState])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream, remoteVideoRef, callState])

  if (callState === 'idle') return null

  // Incoming call modal
  if (callState === 'incoming') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
        >
          <div className="glass-card rounded-3xl p-8 w-80 text-center border border-surface/10 shadow-card">
            {/* Animated ring */}
            <div className="relative w-24 h-24 mx-auto mb-5">
              {[1, 2, 3].map(i => (
                <motion.div key={i}
                  animate={{ scale: [1, 1.5 + i * 0.2], opacity: [0.4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full border-2 border-accent-primary"
                />
              ))}
              <Avatar name={callerInfo?.name} src={callerInfo?.avatar} size="2xl" className="relative z-10" />
            </div>

            <p className="text-text-faint text-sm mb-1">Incoming {callType} call</p>
            <h3 className="text-xl font-bold text-text-primary mb-6">{callerInfo?.name}</h3>

            <div className="flex items-center justify-center gap-6">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={rejectCall}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors">
                <Phone className="w-6 h-6 text-white rotate-[135deg]" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={acceptCall}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg transition-colors">
                <Phone className="w-6 h-6 text-white" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col overflow-hidden"
    >
      {/* Remote video (full screen) / Audio Wrapper */}
      <div className="relative flex-1 bg-bg-primary">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={cn("w-full h-full object-cover", (!remoteStream || callType === 'audio') && "hidden")}
        />
        
        {(!remoteStream || callType === 'audio') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-primary">
            {callState === 'calling' ? (
              <>
                <div className="relative mb-6">
                  {[1, 2, 3].map(i => (
                    <motion.div key={i}
                      animate={{ scale: [1, 1.4 + i * 0.15], opacity: [0.3, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }}
                      className="absolute inset-0 rounded-full border border-accent-primary"
                    />
                  ))}
                  <Avatar name={callerInfo?.name || 'User'} src={callerInfo?.avatar} size="2xl" className="relative z-10" />
                </div>
                <p className="text-text-primary font-semibold text-lg">{callerInfo?.name || 'Calling…'}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {[0, 0.2, 0.4].map((d, i) => (
                    <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: d }}
                      className="w-1.5 h-1.5 rounded-full bg-accent-light" />
                  ))}
                  <span className="text-text-muted text-sm ml-1">Connecting…</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative mb-6">
                  {callState === 'connected' && callType === 'audio' && [1, 2].map(i => (
                    <motion.div key={i}
                      animate={{ scale: [1, 1.2 + i * 0.1], opacity: [0.2, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                      className="absolute inset-0 rounded-full border-2 border-accent-secondary"
                    />
                  ))}
                  <Avatar name={callerInfo?.name} src={callerInfo?.avatar} size="2xl" className="relative z-10" />
                </div>
                <h2 className="text-2xl font-bold text-white">{callerInfo?.name}</h2>
                <p className="text-accent-light text-sm mt-2">{callType === 'audio' ? 'Audio Call' : 'Video Call'}</p>
              </div>
            )}
          </div>
        )}

        {/* Local video (PiP) */}
        {callType === 'video' && (
          <div className="absolute top-4 right-4 w-36 h-24 sm:w-44 sm:h-28 rounded-xl overflow-hidden border-2 border-surface/20 shadow-lg bg-bg-primary z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={cn('w-full h-full object-cover', isVideoOff && 'invisible')}
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-bg-tertiary">
                <VideoOff className="w-5 h-5 text-text-faint" />
              </div>
            )}
          </div>
        )}

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4 bg-gradient-to-b from-black/60 to-transparent z-20">
          <div>
            <p className="text-white font-semibold text-sm">
              {callerInfo?.name || (callType === 'audio' ? 'Audio Call' : 'Video Call')}
            </p>
            {callState === 'connected' && (
              <p className="text-white/60 text-xs font-mono">{formatDuration(callDuration)}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-surface/10 rounded-lg transition-colors text-white/60 hover:text-white">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-t from-black/90 to-transparent pt-8 pb-8 flex items-center justify-center gap-4 z-20 relative">
        <ControlBtn
          icon={isMuted ? MicOff : Mic}
          active={isMuted}
          onClick={toggleMute}
          label={isMuted ? 'Unmute' : 'Mute'}
        />
        {callType === 'video' && (
          <>
            <ControlBtn
              icon={isVideoOff ? VideoOff : Video}
              active={isVideoOff}
              onClick={toggleVideo}
              label={isVideoOff ? 'Start Video' : 'Stop Video'}
            />
            <ControlBtn
              icon={Monitor}
              onClick={toggleScreenShare}
              label="Share Screen"
            />
          </>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={endCall}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex flex-col items-center justify-center shadow-lg transition-colors gap-0.5"
          title="End call"
        >
          <Phone className="w-6 h-6 text-white rotate-[135deg]" />
        </motion.button>
      </div>
    </motion.div>
  )
}

const ControlBtn = ({ icon: Icon, active, onClick, label }) => (
  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
    onClick={onClick} title={label}
    className={cn(
      'w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all',
      active ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-surface/10 text-white hover:bg-surface/20'
    )}>
    <Icon className="w-5 h-5" />
  </motion.button>
)

export default VideoCallRoom
