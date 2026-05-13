import { Outlet, useLocation } from 'react-router-dom'
import { useChat } from '../context/ChatContext'
import Sidebar from './Sidebar'
import VideoCallRoom from './VideoCallRoom'

const MainLayout = () => {
  const { activeConversation } = useChat()
  const location = useLocation()
  
  // On mobile, if we have an active conversation and we're on /chat, hide sidebar
  const isChatRoute = location.pathname === '/chat'
  const hideSidebarOnMobile = isChatRoute && activeConversation

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden relative">
      <div className={`h-full w-full md:w-auto flex-shrink-0 absolute md:relative z-20 transition-transform duration-300 bg-bg-primary ${hideSidebarOnMobile ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
        <Sidebar />
      </div>
      <main className={`flex-1 flex flex-col h-full w-full absolute md:relative overflow-hidden transition-transform duration-300 md:translate-x-0 ${hideSidebarOnMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0 z-10 md:z-0'}`}>
        <Outlet />
      </main>
      <VideoCallRoom />
    </div>
  )
}

export default MainLayout
