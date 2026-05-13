/**
 * useWebRTC.js — Complete rewrite for production reliability
 *
 * Root-cause fixes:
 * 1. `trickle: true` — the old code used trickle:false which means the caller
 *    waits for ALL ICE candidates before sending the offer. On Render (behind
 *    a proxy/NAT) this causes a long delay and often fails. With trickle:true
 *    candidates are exchanged incrementally via the `ice_candidate` socket event.
 *
 * 2. STUN/TURN servers — without STUN the peer cannot discover its public IP
 *    when behind NAT. We add Google STUN + Open Relay TURN as fallback.
 *
 * 3. callState race condition — the timeout closure captured a stale callState
 *    value (always 'calling'). Now we use a ref to track state for timeouts.
 *
 * 4. Duplicate peer connections — acceptCall could be called while peerRef
 *    already held an old peer. We now always destroy first.
 *
 * 5. Memory leaks — all tracks are stopped and refs cleared on every cleanup path.
 *
 * 6. endCall emitted twice — caller emitted to both targetUserId AND callerInfo
 *    which created a double "call_ended" on the server. Fixed.
 *
 * 7. callerInfo missing name in 'calling' state — when *you* initiate the call,
 *    callerInfo is null. The UI used callerInfo?.name for the avatar; now we
 *    expose `contactInfo` (the person you're calling) separately.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import Peer from 'simple-peer'
import { getSocket } from '../socket/socket'
import { useAuth } from '../context/AuthContext'

// ─── ICE Servers ─────────────────────────────────────────────
// Uses Google STUN + OpenRelay TURN (free, no sign-up required)
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
  // 'idle' | 'calling' | 'ringing' | 'incoming' | 'connecting' | 'connected'
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
  const callStateRef = useRef('idle') // mirrors callState but readable inside closures
  const localStreamRef = useRef(null) // mirrors localStream for cleanup closures

  // Keep callStateRef in sync
  const updateCallState = useCallback((state) => {
    callStateRef.current = state
    setCallState(state)
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
    if (localVideoRef.current) localVideoRef.current.srcObject = stream
    return stream
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
    setCallerInfo(null)
    setContactInfo(null)
    setRemoteStream(null)
    setIsMuted(false)
    setIsVideoOff(false)
    targetUserIdRef.current = null
    currentConvIdRef.current = null
    incomingSignalRef.current = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
  }, [destroyPeer, stopLocalStream, stopTimer, updateCallState])

  // ─── Create Peer ──────────────────────────────────────────
  const createPeer = useCallback((initiator, stream) => {
    // Always destroy any existing peer first
    destroyPeer()

    const peer = new Peer({
      initiator,
      trickle: true,           // ← critical fix: exchange ICE candidates incrementally
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
      setCallType(type)
      setContactInfo(contact) // store who we're calling for the UI
      targetUserIdRef.current = targetUserId
      currentConvIdRef.current = conversationId

      const stream = await getMediaStream(type)
      const peer = createPeer(true, stream)

      // trickle:true — each ICE candidate fires this event separately
      peer.on('signal', (signalData) => {
        const sk = getSocket()
        if (!sk) return
        if (signalData.type === 'offer') {
          // Send the offer
          sk.emit('call_user', { to: targetUserId, signal: signalData, callType: type, conversationId })
          updateCallState('ringing') // offer sent — waiting for receiver to pick up
        } else {
          // Send ICE candidate
          sk.emit('ice_candidate', { to: targetUserId, candidate: signalData })
        }
      })

      peer.on('stream', (remStream) => {
        clearTimeout(callTimeoutRef.current)
        setRemoteStream(remStream)
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remStream
        updateCallState('connected')
        startTimer()
      })

      peer.on('error', (err) => {
        console.error('[Peer] Error:', err.message)
        endCall()
      })

      peer.on('close', () => {
        if (callStateRef.current !== 'idle') endCall()
      })

      // Auto-cancel after 45 seconds if no answer
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
  }, [socket, getMediaStream, createPeer, startTimer, resetCallState, onCallEnd, updateCallState])

  // ─── Accept Incoming Call ─────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!socket || !incomingSignalRef.current) return
    const callerUserId = callerInfo?.userId
    if (!callerUserId) return

    try {
      updateCallState('connecting')
      const stream = await getMediaStream(callType)
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
        setRemoteStream(remStream)
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remStream
        updateCallState('connected')
        startTimer()
      })

      peer.on('error', (err) => {
        console.error('[Peer] Accept error:', err.message)
        endCall()
      })

      peer.on('close', () => {
        if (callStateRef.current !== 'idle') endCall()
      })

      // Feed the stored offer signal into the peer
      peer.signal(incomingSignalRef.current)

    } catch (err) {
      console.error('[WebRTC] acceptCall error:', err)
      resetCallState()
    }
  }, [socket, callType, callerInfo, getMediaStream, createPeer, startTimer, resetCallState, updateCallState])

  // ─── Reject Call ──────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (!socket || !callerInfo) return
    socket.emit('call_rejected', {
      to: callerInfo.userId,
      conversationId: currentConvIdRef.current,
      callType,
    })
    resetCallState()
  }, [socket, callerInfo, callType, resetCallState])

  // ─── End Call ─────────────────────────────────────────────
  const endCall = useCallback((reason = 'ended') => {
    const sk = getSocket()
    const targetId = targetUserIdRef.current || callerInfo?.userId
    if (targetId && sk && callStateRef.current !== 'idle') {
      sk.emit('call_ended', {
        to: targetId,
        conversationId: currentConvIdRef.current,
        callType,
        duration: durationTimerRef.current ? undefined : 0,
      })
    }
    resetCallState()
    onCallEnd?.(reason)
  }, [callerInfo, callType, resetCallState, onCallEnd])

  // ─── Toggle Controls ──────────────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (stream) {
      const enabled = !stream.getAudioTracks()[0]?.enabled
      stream.getAudioTracks().forEach(t => { t.enabled = enabled })
      setIsMuted(!enabled)
    }
  }, [])

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current
    if (stream) {
      const enabled = !stream.getVideoTracks()[0]?.enabled
      stream.getVideoTracks().forEach(t => { t.enabled = enabled })
      setIsVideoOff(!enabled)
    }
  }, [])

  const toggleScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screenTrack = screenStream.getVideoTracks()[0]
      const sender = peerRef.current?._pc?.getSenders().find(s => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(screenTrack)
      screenTrack.onended = () => {
        const camTrack = localStreamRef.current?.getVideoTracks()[0]
        if (sender && camTrack) sender.replaceTrack(camTrack)
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
      // Ignore if already in a call
      if (callStateRef.current !== 'idle') {
        sk.emit('call_rejected', { to: from, conversationId, callType: type })
        return
      }
      incomingSignalRef.current = signal
      currentConvIdRef.current = conversationId
      setCallerInfo({ userId: from, ...caller })
      setCallType(type)
      updateCallState('incoming')
    }

    // Caller receives this when receiver accepts
    const onCallAccepted = ({ signal, from }) => {
      clearTimeout(callTimeoutRef.current)
      updateCallState('connecting')
      // Feed the answer signal into our initiator peer
      if (peerRef.current) {
        peerRef.current.signal(signal)
      }
    }

    // Exchange ICE candidates (trickle mode)
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
  }, [user, resetCallState, onCallEnd, updateCallState])

  // ─── Cleanup on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(callTimeoutRef.current)
      clearInterval(durationTimerRef.current)
      destroyPeer()
      // Stop tracks directly from ref (avoids stale closure)
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
