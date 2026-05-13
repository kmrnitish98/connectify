import { useEffect, useRef, useState, useCallback } from 'react'
import Peer from 'simple-peer'
import { getSocket } from '../socket/socket'
import { useAuth } from '../context/AuthContext'

const useWebRTC = ({ currentUser, onCallEnd } = {}) => {
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [callState, setCallState] = useState('idle') // 'idle'|'calling'|'incoming'|'connected'
  const [callerInfo, setCallerInfo] = useState(null)
  const [callType, setCallType] = useState('video') // 'video'|'audio'
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  const { user } = useAuth() // Triggers re-render when auth changes so we get the fresh socket

  const peerRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const incomingSignalRef = useRef(null)
  const durationTimerRef = useRef(null)
  const callTimeoutRef = useRef(null)
  const targetUserIdRef = useRef(null)
  const currentConvIdRef = useRef(null)

  const socket = getSocket()

  const getMediaStream = useCallback(async (type = 'video') => {
    const constraints = {
      audio: true,
      video: type === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false,
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    setLocalStream(stream)
    if (localVideoRef.current) localVideoRef.current.srcObject = stream
    return stream
  }, [])

  const startTimer = () => {
    durationTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
  }

  const stopTimer = () => {
    clearInterval(durationTimerRef.current)
    setCallDuration(0)
  }

  const destroyPeer = useCallback(() => {
    peerRef.current?.destroy()
    peerRef.current = null
  }, [])

  const stopLocalStream = useCallback(() => {
    localStream?.getTracks().forEach(t => t.stop())
    setLocalStream(null)
    if (localVideoRef.current) localVideoRef.current.srcObject = null
  }, [localStream])

  // ─── Initiate Call ────────────────────────────────────────
  const startCall = useCallback(async (targetUserId, type = 'video', conversationId = null) => {
    if (!socket) return
    try {
      setCallType(type)
      setCallState('calling')
      targetUserIdRef.current = targetUserId
      currentConvIdRef.current = conversationId

      const stream = await getMediaStream(type)
      const peer = new Peer({ initiator: true, trickle: false, stream })

      peer.on('signal', (signal) => {
        socket.emit('call_user', { to: targetUserId, signal, callType: type, conversationId })
      })

      // Auto cancel after 30 sec
      callTimeoutRef.current = setTimeout(() => {
        if (callState === 'calling') {
          socket.emit('call_timeout', { to: targetUserId, callType: type, conversationId })
          endCall()
        }
      }, 30000)

      peer.on('stream', (remStream) => {
        clearTimeout(callTimeoutRef.current)
        setRemoteStream(remStream)
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remStream
        setCallState('connected')
        startTimer()
      })

      peer.on('error', (err) => { console.error('Peer error:', err); endCall() })
      peer.on('close', () => endCall())

      peerRef.current = peer
    } catch (err) {
      console.error('startCall error:', err)
      setCallState('idle')
    }
  }, [socket, getMediaStream])

  // ─── Accept Incoming Call ─────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!socket || !incomingSignalRef.current) return
    try {
      const stream = await getMediaStream(callType)
      const peer = new Peer({ initiator: false, trickle: false, stream })

      peer.on('signal', (signal) => {
        socket.emit('call_accepted', { to: callerInfo.userId, signal })
      })

      peer.on('stream', (remStream) => {
        setRemoteStream(remStream)
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remStream
        setCallState('connected')
        startTimer()
      })

      peer.on('error', (err) => { console.error('Peer error:', err); endCall() })
      peer.on('close', () => endCall())

      peer.signal(incomingSignalRef.current)
      peerRef.current = peer
    } catch (err) {
      console.error('acceptCall error:', err)
      endCall()
    }
  }, [socket, callType, callerInfo, getMediaStream])

  // ─── Reject Call ──────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (!socket || !callerInfo) return
    socket.emit('call_rejected', { to: callerInfo.userId })
    setCallState('idle')
    setCallerInfo(null)
    incomingSignalRef.current = null
  }, [socket, callerInfo])

  // ─── End Call ─────────────────────────────────────────────
  const endCall = useCallback(() => {
    clearTimeout(callTimeoutRef.current)
    if (targetUserIdRef.current && socket) {
      socket.emit('call_ended', { to: targetUserIdRef.current, conversationId: currentConvIdRef.current })
    }
    if (callerInfo?.userId && socket) {
      socket.emit('call_ended', { to: callerInfo.userId, conversationId: currentConvIdRef.current })
    }

    destroyPeer()
    stopLocalStream()
    stopTimer()
    setCallState('idle')
    setCallerInfo(null)
    setRemoteStream(null)
    targetUserIdRef.current = null
    currentConvIdRef.current = null
    incomingSignalRef.current = null
    onCallEnd?.()
  }, [socket, callerInfo, destroyPeer, stopLocalStream, onCallEnd])

  // ─── Toggle Controls ──────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
      setIsMuted(m => !m)
    }
  }, [localStream])

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
      setIsVideoOff(v => !v)
    }
  }, [localStream])

  const toggleScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screenTrack = screenStream.getVideoTracks()[0]

      const sender = peerRef.current?._pc?.getSenders().find(s => s.track?.kind === 'video')
      if (sender) await sender.replaceTrack(screenTrack)

      screenTrack.onended = () => {
        const camTrack = localStream?.getVideoTracks()[0]
        if (sender && camTrack) sender.replaceTrack(camTrack)
      }
    } catch (err) {
      console.error('Screen share error:', err)
    }
  }, [localStream])

  // ─── Socket Listeners ─────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    const onIncomingCall = ({ from, signal, callType: type, caller, conversationId }) => {
      incomingSignalRef.current = signal
      currentConvIdRef.current = conversationId
      setCallerInfo({ userId: from, ...caller })
      setCallType(type)
      setCallState('incoming')
    }

    const onCallAccepted = ({ signal }) => {
      clearTimeout(callTimeoutRef.current)
      peerRef.current?.signal(signal)
    }

    const onCallRejected = () => {
      clearTimeout(callTimeoutRef.current)
      destroyPeer()
      stopLocalStream()
      setCallState('idle')
    }

    const onCallEnded = () => {
      destroyPeer()
      stopLocalStream()
      stopTimer()
      setCallState('idle')
      setRemoteStream(null)
      onCallEnd?.()
    }

    const onCallUnavailable = () => {
      clearTimeout(callTimeoutRef.current)
      destroyPeer()
      stopLocalStream()
      setCallState('idle')
      // Optional: could add a toast notification here if desired
    }

    socket.on('incoming_call', onIncomingCall)
    socket.on('call_accepted', onCallAccepted)
    socket.on('call_rejected', onCallRejected)
    socket.on('call_ended', onCallEnded)
    socket.on('call_unavailable', onCallUnavailable)

    return () => {
      socket.off('incoming_call', onIncomingCall)
      socket.off('call_accepted', onCallAccepted)
      socket.off('call_rejected', onCallRejected)
      socket.off('call_ended', onCallEnded)
      socket.off('call_unavailable', onCallUnavailable)
    }
  }, [socket, destroyPeer, stopLocalStream, onCallEnd])

  return {
    localStream, remoteStream, callState, callerInfo, callType,
    isMuted, isVideoOff, callDuration,
    localVideoRef, remoteVideoRef,
    startCall, acceptCall, rejectCall, endCall,
    toggleMute, toggleVideo, toggleScreenShare,
  }
}

export default useWebRTC
