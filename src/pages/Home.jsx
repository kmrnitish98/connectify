import { useChat } from '../context/ChatContext'
import { useCall } from '../context/CallContext'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import VideoCallRoom from '../components/VideoCallRoom'

const Home = () => {
  const { activeConversation } = useChat()

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden relative">
      <div className={`h-full w-full md:w-auto flex-shrink-0 absolute md:relative z-10 transition-transform duration-300 md:translate-x-0 ${activeConversation ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
        <Sidebar />
      </div>
      <main className={`flex-1 flex flex-col h-full w-full absolute md:relative overflow-hidden transition-transform duration-300 md:translate-x-0 ${activeConversation ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <ChatWindow />
      </main>
      <VideoCallRoom />
    </div>
  )
}

export default Home
