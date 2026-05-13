import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import { ThemeProvider } from './context/ThemeContext'
import { CallProvider } from './context/CallContext'
import { pageTransition } from './animations/variants'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import MainLayout from './components/MainLayout'
import ChatWindow from './components/ChatWindow'
import CallHistory from './components/CallHistory'

const PageWrapper = ({ children }) => (
  <motion.div initial={pageTransition.initial} animate={pageTransition.animate}
    exit={pageTransition.exit} transition={pageTransition.transition} className="min-h-screen">
    {children}
  </motion.div>
)

const ProtectedRoute = ({ children }) => {
  const { user, isInitializing } = useAuth()
  if (isInitializing) return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary animate-pulse" />
        <p className="text-text-faint text-sm animate-pulse">Loading…</p>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const { user, isInitializing } = useAuth()
  if (isInitializing) return null
  return !user ? children : <Navigate to="/chat" replace />
}

const AppRoutes = () => (
  <AnimatePresence mode="wait">
    <ChatProvider>
      <CallProvider>
        <Routes>
          <Route path="/" element={<PublicRoute><PageWrapper><Landing /></PageWrapper></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><PageWrapper><Login /></PageWrapper></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><PageWrapper><Signup /></PageWrapper></PublicRoute>} />
          
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/chat" element={<ChatWindow />} />
            <Route path="/groups" element={<ChatWindow />} />
            <Route path="/starred" element={<ChatWindow />} />
            <Route path="/calls" element={<CallHistory />} />
            <Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />
            <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CallProvider>
    </ChatProvider>
  </AnimatePresence>
)

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#111827',
                color: '#F8FAFC',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#22C55E', secondary: '#111827' } },
              error: { iconTheme: { primary: '#EF4444', secondary: '#111827' } },
            }}
          />
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
