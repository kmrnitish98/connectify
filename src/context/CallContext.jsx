import { createContext, useContext } from 'react'
import useWebRTC from '../hooks/useWebRTC'
import toast from 'react-hot-toast'

const CallContext = createContext()

export const CallProvider = ({ children }) => {
  // FIX #14: Wire onCallEnd to toast notifications so user gets feedback
  // on missed, rejected, or unavailable calls.
  const webRTC = useWebRTC({
    onCallEnd: (reason) => {
      switch (reason) {
        case 'rejected':
          toast.error('Call was declined', { icon: '📵', duration: 3000 })
          break
        case 'timeout':
          toast('No answer — call timed out', { icon: '⏱', duration: 3000 })
          break
        case 'unavailable':
          toast('User is unavailable right now', { icon: '📴', duration: 3000 })
          break
        case 'ended':
          // silent — expected end
          break
        default:
          break
      }
    },
  })

  return (
    <CallContext.Provider value={webRTC}>
      {children}
    </CallContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCall = () => useContext(CallContext)
