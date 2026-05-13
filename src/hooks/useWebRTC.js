/**
 * useWebRTC.js — Production-reliable WebRTC hook
 *
 * Fixes applied in this version:
 * 1. trickle:true — exchange ICE candidates incrementally (faster connection)
 * 2. STUN/TURN servers — Google STUN + OpenRelay TURN for NAT traversal
 * 3. callStateRef — avoids stale closure in timeout callbacks
 * 4. callerInfoRef — avoids stale callerInfo in endCall closure (FIX #4)
 * 5. Remote audio unmuted — explicitly set muted=false + call play() (FIX #5)
 * 6. endCall emitted only once — no double-emit bug
 * 7. Peer always destroyed before creating new one
 * 8. Full cleanup on unmount — no memory leaks
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import Peer from 'simple-peer'
import { getSocket } from '../socket/socket'
import { useAuth } from '../context/AuthContext'

// ─── ICE Servers ─────────────────────────────────────────────
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
}

const useWebRTC = ({ onCallEnd } = {}) => {
  const { user } = useAuth()

  // ─── State ────────────────────────────────────────────────
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [callState, setCallState] = useState('idle')
  const [callerInfo, setCallerInfo] = useState(null)    // who is calling us
  const [contactInfo, setContactInfo] = useState(null)  // who WE are calling
  const [callType, setCallType] = useState('video')
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  // ─── Refs ─────────────────────────────────────────────────
  const peerRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const incomingSignalRef = useRef(null)
  const durationTimerRef = useRef(null)
  const callTimeoutRef = useRef(null)
  const targetUserIdRef = useRef(null)
  const currentConvIdRef = useRef(null)
  const callStateRef = useRef('idle')   // mirrors callState — readable inside closures
  const localStreamRef = useRef(null)   // mirrors localStream for cleanup
  const callerInfoRef = useRef(null)    // FIX #4: mirrors callerInfo for endCall closure
  const callTypeRef = useRef('video')   // mirrors callType for closures
  // FIX: stable ref to endCall so peer handlers can call it without TDZ
  const endCallRef = useRef(null)

  // Keep refs in sync
  const updateCallState = useCallback((state) => {
    callStateRef.current = state
    setCallState(state)
  }, [])

  const updateCallerInfo = useCallback((info) => {
    callerInfoRef.current = info
    setCallerInfo(info)
  }, [])

  const updateCallType = useCallback((type) => {
    callTypeRef.current = type
    setCallType(type)
  }, [])

  const socket = getSocket()

  // ─── Media Helpers ────────────────────────────────────────
  const getMediaStream = useCallback(async (type = 'video') => {
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: type === 'video'
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        : false,
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    localStreamRef.current = stream
    setLocalStream(stream)
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
      localVideoRef.current.muted = true // local preview always muted (prevents echo)
    }
    return stream
  }, [])

  // ─── Remote Stream Attachment (FIX #5) ────────────────────
  // Explicitly unmute + play the remote video/audio element.
  const attachRemoteStream = useCallback((stream) => {
    setRemoteStream(stream)
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream
      remoteVideoRef.current.muted = false // MUST NOT be muted for other side to be heard
      remoteVideoRef.current.play().catch((e) => {
        // Autoplay policy — user interaction required on some browsers
        console.warn('[WebRTC] remoteVideo.play() blocked:', e.message)
      })
    }
  }, [])

  // ─── Timer ────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    clearInterval(durationTimerRef.current)
    setCallDuration(0)
    durationTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
  }, [])

  const stopTimer = useCallback(() => {
    clearInterval(durationTimerRef.current)
    durationTimerRef.current = null
    setCallDuration(0)
  }, [])

  // ─── Peer Cleanup ─────────────────────────────────────────
  const destroyPeer = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.removeAllListeners?.()
      peerRef.current.destroy()
      peerRef.current = null
    }
  }, [])

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)
    if (localVideoRef.current) localVideoRef.current.srcObject = null
  }, [])

  // ─── Full Reset ───────────────────────────────────────────
  const resetCallState = useCallback(() => {
    clearTimeout(callTimeoutRef.current)
    destroyPeer()
    stopLocalStream()
    stopTimer()
    updateCallState('idle')
    updateCallerInfo(null)
    setContactInfo(null)
    setRemoteStream(null)
    setIsMuted(false)
    setIsVideoOff(false)
    targetUserIdRef.current = null
    currentConvIdRef.current = null
    incomingSignalRef.current = null
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
  }, [destroyPeer, stopLocalStream, stopTimer, updateCallState, updateCallerInfo])

  // ─── Create Peer ──────────────────────────────────────────
  const createPeer = useCallback((initiator, stream) => {
    destroyPeer()
    const peer = new Peer({
      initiator,
      trickle: true,   // exchange ICE candidates incrementally
      stream,
      config: ICE_SERVERS,
    })
    peerRef.current = peer
    return peer
  }, [destroyPeer])

  // ─── Initiate Call ────────────────────────────────────────
  const startCall = useCallback(async (targetUserId, type = 'video', conversationId = null, contact = null) => {
    if (!socket) { console.warn('[WebRTC] No socket'); return }
    if (callStateRef.current !== 'idle') { console.warn('[WebRTC] Call already in progress'); return }

    try {
      updateCallState('calling')
      updateCallType(type)
      setContactInfo(contact)
      targetUserIdRef.current = targetUserId
      currentConvIdRef.current = conversationId

      const stream = await getMediaStream(type)
      const peer = createPeer(true, stream)

      peer.on('signal', (signalData) => {
        const sk = getSocket()
        if (!sk) return
        if (signalData.type === 'offer') {
          sk.emit('call_user', { to: targetUserId, signal: signalData, callType: type, conversationId })
          updateCallState('ringing')
        } else {
          sk.emit('ice_candidate', { to: targetUserId, candidate: signalData })
        }
      })

      peer.on('stream', (remStream) => {
        clearTimeout(callTimeoutRef.current)
        attachRemoteStream(remStream) // FIX #5: explicit unmute + play
        updateCallState('connected')
        startTimer()
      })

      peer.on('error', (err) => {
        console.error('[Peer] Error:', err.message)
        endCallRef.current?.()
      })

      peer.on('close', () => {
        if (callStateRef.current !== 'idle') endCallRef.current?.()
      })

      callTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === 'ringing' || callStateRef.current === 'calling') {
          const sk = getSocket()
          sk?.emit('call_timeout', { to: targetUserId, callType: type, conversationId })
          resetCallState()
          onCallEnd?.('timeout')
        }
      }, 45000)

    } catch (err) {
      console.error('[WebRTC] startCall error:', err)
      resetCallState()
    }
  }, [socket, getMediaStream, createPeer, attachRemoteStream, startTimer, resetCallState, onCallEnd, updateCallState, updateCallType])

  // ─── Accept Incoming Call ─────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!socket || !incomingSignalRef.current) return
    const callerUserId = callerInfoRef.current?.userId // FIX #4: use ref
    if (!callerUserId) return

    try {
      updateCallState('connecting')
      const stream = await getMediaStream(callTypeRef.current) // FIX #4: use ref
      const peer = createPeer(false, stream)

      peer.on('signal', (signalData) => {
        const sk = getSocket()
        if (!sk) return
        if (signalData.type === 'answer') {
          sk.emit('call_accepted', { to: callerUserId, signal: signalData })
        } else {
          sk.emit('ice_candidate', { to: callerUserId, candidate: signalData })
        }
      })

      peer.on('stream', (remStream) => {
        attachRemoteStream(remStream) // FIX #5: explicit unmute + play
        updateCallState('connected')
        startTimer()
      })

      peer.on('error', (err) => {
        console.error('[Peer] Accept error:', err.message)
        endCallRef.current?.()
      })

      peer.on('close', () => {
        if (callStateRef.current !== 'idle') endCallRef.current?.()
      })

      peer.signal(incomingSignalRef.current)

    } catch (err) {
      console.error('[WebRTC] acceptCall error:', err)
      resetCallState()
    }
  }, [socket, getMediaStream, createPeer, attachRemoteStream, startTimer, resetCallState, updateCallState])

  // ─── Reject Call ──────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (!socket || !callerInfoRef.current) return
    socket.emit('call_rejected', {
      to: callerInfoRef.current.userId,
      conversationId: currentConvIdRef.current,
      callType: callTypeRef.current,
    })
    resetCallState()
  }, [socket, resetCallState])

  // ─── End Call ─────────────────────────────────────────────
  // FIX #4: Read targetId from refs, not from stale closure state
  const endCall = useCallback((reason = 'ended') => {
    const sk = getSocket()
    const targetId = targetUserIdRef.current || callerInfoRef.current?.userId
    if (targetId && sk && callStateRef.current !== 'idle') {
      sk.emit('call_ended', {
        to: targetId,
        conversationId: currentConvIdRef.current,
        callType: callTypeRef.current,
        duration: durationTimerRef.current ? callDuration : 0,
      })
    }
    resetCallState()
    onCallEnd?.(reason)
  }, [callDuration, resetCallState, onCallEnd])

  // FIX: Keep endCallRef in sync via useEffect so we don't write to a ref during render
  useEffect(() => {
    endCallRef.current = endCall
  })

  // ─── Toggle Controls ──────────────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (stream) {
      const track = stream.getAudioTracks()[0]
      if (track) {
        track.enabled = !track.enabled
        setIsMuted(!track.enabled)
      }
    }
  }, [])

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current
    if (stream) {
      const track = stream.getVideoTracks()[0]
      if (track) {
        track.enabled = !track.enabled
        setIsVideoOff(!track.enabled)
      }
    }
  }, [])

  const toggleScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screenTrack = screenStream.getVideoTracks()[0]
      const peer = peerRef.current
      // Use RTCPeerConnection sender for track replacement
      const sender = peer?._pc?.getSenders().find(s => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(screenTrack)
      // When screen sharing stops, revert to camera
      screenTrack.onended = async () => {
        const camTrack = localStreamRef.current?.getVideoTracks()[0]
        if (sender && camTrack) await sender.replaceTrack(camTrack)
      }
    } catch (err) {
      console.error('[WebRTC] Screen share error:', err)
    }
  }, [])

  // ─── Socket Listeners ─────────────────────────────────────
  useEffect(() => {
    const sk = getSocket()
    if (!sk || !user) return

    const onIncomingCall = ({ from, signal, callType: type, caller, conversationId }) => {
      // Auto-reject if already in a call
      if (callStateRef.current !== 'idle') {
        sk.emit('call_rejected', { to: from, conversationId, callType: type })
        return
      }
      incomingSignalRef.current = signal
      currentConvIdRef.current = conversationId
      updateCallerInfo({ userId: from, ...caller })
      updateCallType(type)
      updateCallState('incoming')
    }

    const onCallAccepted = ({ signal }) => {
      clearTimeout(callTimeoutRef.current)
      updateCallState('connecting')
      if (peerRef.current) {
        peerRef.current.signal(signal)
      }
    }

    // Trickle ICE relay
    const onIceCandidate = ({ candidate }) => {
      if (peerRef.current && candidate) {
        peerRef.current.signal(candidate)
      }
    }

    const onCallRejected = () => {
      clearTimeout(callTimeoutRef.current)
      resetCallState()
      onCallEnd?.('rejected')
    }

    const onCallEnded = () => {
      resetCallState()
      onCallEnd?.('ended')
    }

    const onCallUnavailable = () => {
      clearTimeout(callTimeoutRef.current)
      resetCallState()
      onCallEnd?.('unavailable')
    }

    const onCallTimeout = () => {
      resetCallState()
      onCallEnd?.('timeout')
    }

    sk.on('incoming_call', onIncomingCall)
    sk.on('call_accepted', onCallAccepted)
    sk.on('ice_candidate', onIceCandidate)
    sk.on('call_rejected', onCallRejected)
    sk.on('call_ended', onCallEnded)
    sk.on('call_unavailable', onCallUnavailable)
    sk.on('call_timeout', onCallTimeout)

    return () => {
      sk.off('incoming_call', onIncomingCall)
      sk.off('call_accepted', onCallAccepted)
      sk.off('ice_candidate', onIceCandidate)
      sk.off('call_rejected', onCallRejected)
      sk.off('call_ended', onCallEnded)
      sk.off('call_unavailable', onCallUnavailable)
      sk.off('call_timeout', onCallTimeout)
    }
  }, [user, resetCallState, onCallEnd, updateCallState, updateCallerInfo, updateCallType])

  // ─── Cleanup on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(callTimeoutRef.current)
      clearInterval(durationTimerRef.current)
      destroyPeer()
      localStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [destroyPeer])

  return {
    // State
    localStream, remoteStream, callState, callerInfo, contactInfo,
    callType, isMuted, isVideoOff, callDuration,
    // Refs for video elements
    localVideoRef, remoteVideoRef,
    // Actions
    startCall, acceptCall, rejectCall, endCall,
    toggleMute, toggleVideo, toggleScreenShare,
  }
}

export default useWebRTC
