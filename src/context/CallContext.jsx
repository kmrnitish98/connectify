import { createContext, useContext } from 'react'
import useWebRTC from '../hooks/useWebRTC'

const CallContext = createContext()

export const CallProvider = ({ children }) => {
  const webRTC = useWebRTC()

  return (
    <CallContext.Provider value={webRTC}>
      {children}
    </CallContext.Provider>
  )
}

export const useCall = () => useContext(CallContext)
