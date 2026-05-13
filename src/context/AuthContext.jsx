import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { authService } from '../services/authService'
import { initSocket, disconnectSocket } from '../socket/socket'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('connectify_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  // On mount: verify token is still valid
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('connectify_token')
      if (!token) { setIsInitializing(false); return }
      try {
        const data = await authService.getMe()
        setUser(data.user)
        localStorage.setItem('connectify_user', JSON.stringify(data.user))
        initSocket(token)
      } catch {
        localStorage.removeItem('connectify_token')
        localStorage.removeItem('connectify_user')
        setUser(null)
      } finally {
        setIsInitializing(false)
      }
    }
    verifyAuth()
  }, [])

  const login = useCallback(async (email, password) => {
    setIsLoading(true)
    try {
      const data = await authService.login(email, password)
      localStorage.setItem('connectify_token', data.token)
      localStorage.setItem('connectify_user', JSON.stringify(data.user))
      setUser(data.user)
      initSocket(data.token)
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signup = useCallback(async (name, email, password) => {
    setIsLoading(true)
    try {
      const data = await authService.register(name, email, password)
      localStorage.setItem('connectify_token', data.token)
      localStorage.setItem('connectify_user', JSON.stringify(data.user))
      setUser(data.user)
      initSocket(data.token)
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Signup failed' }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try { await authService.logout() } catch {}
    disconnectSocket()
    localStorage.removeItem('connectify_token')
    localStorage.removeItem('connectify_user')
    setUser(null)
  }, [])

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates }
      localStorage.setItem('connectify_user', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, isInitializing, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
