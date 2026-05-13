import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useChat } from '../context/ChatContext'
import Sidebar from './Sidebar'
import VideoCallRoom from './VideoCallRoom'

const MainLayout = () => {
  const { activeConversation } = useChat()
  const location = useLocation()
  
  // FIX #6: Include /groups and /starred in the chat slide logic
  const isChatRoute = ['/chat', '/groups', '/starred'].includes(location.pathname)
  const hideSidebarOnMobile = isChatRoute && activeConversation

  return (
    // FIX #21: Remove z-10 on main content when sidebar is "behind" to prevent
    // iOS Safari tap-through issues. Use pointer-events-none on hidden sidebar instead.
    <div className="flex h-screen bg-bg-primary overflow-hidden relative">
      {/* Sidebar — on mobile: slides left when chat is open */}
      <div
        className={`
          h-full w-full md:w-auto flex-shrink-0
          absolute md:relative
          transition-transform duration-300 bg-bg-primary
          ${hideSidebarOnMobile
            ? '-translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto'
            : 'translate-x-0 z-20'}
        `}
      >
        <Sidebar />
      </div>

      {/* Main content — on mobile: slides in from right when chat opens */}
      <main
        className={`
          flex-1 flex flex-col h-full w-full
          absolute md:relative overflow-hidden
          transition-transform duration-300 md:translate-x-0
          ${hideSidebarOnMobile ? 'translate-x-0 z-10' : 'translate-x-full md:translate-x-0'}
        `}
      >
        <Outlet />
      </main>

      {/* FIX #15: Wrap VideoCallRoom in AnimatePresence so enter/exit animations fire */}
      <AnimatePresence>
        <VideoCallRoom key="video-call-room" />
      </AnimatePresence>
    </div>
  )
}

export default MainLayout
