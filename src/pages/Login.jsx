import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, Zap, Mail, Lock, ArrowRight, GitFork, Globe2
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fadeInUp, staggerContainer, staggerItem } from '../animations/variants'
import Button from '../components/Button'
import toast from 'react-hot-toast'

const Login = () => {
  const navigate = useNavigate()
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill all fields'); return }
    const result = await login(email, password)
    if (result.success) {
      toast.success('Welcome back!')
      navigate('/home')
    } else {
      setError(result.message || 'Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-accent-primary/20 via-bg-primary to-accent-secondary/20 flex-col items-center justify-center p-12">
        {/* Background orbs */}
        <div className="orb w-96 h-96 bg-accent-primary top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <div className="orb w-64 h-64 bg-accent-secondary bottom-0 right-0 translate-x-1/3 translate-y-1/3" />

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="relative z-10 text-center"
        >
          <motion.div variants={staggerItem} className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-glow">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-3xl font-bold text-text-primary">Connectify</span>
          </motion.div>

          <motion.h2 variants={staggerItem} className="text-4xl font-bold text-text-primary mb-4 leading-tight">
            The future of<br />
            <span className="gradient-text">team communication</span>
          </motion.h2>

          <motion.p variants={staggerItem} className="text-text-muted text-lg max-w-sm">
            Real-time messaging, crystal-clear video calls, and seamless collaboration — all in one place.
          </motion.p>

          {/* Floating Cards */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-12 glass-card rounded-2xl p-4 text-left max-w-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <span className="text-white text-xs font-bold">SC</span>
              </div>
              <div>
                <p className="text-text-primary text-sm font-medium">Sarah Chen</p>
                <p className="text-text-faint text-xs">just now</p>
              </div>
            </div>
            <p className="text-text-muted text-sm">The new design is absolutely 🔥 Great work team!</p>
          </motion.div>

          {/* Stats */}
          <motion.div variants={staggerItem} className="mt-8 flex gap-8 justify-center">
            {[['10K+', 'Teams'], ['99.9%', 'Uptime'], ['4.9★', 'Rating']].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold gradient-text">{val}</p>
                <p className="text-text-faint text-sm">{label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <motion.div variants={staggerItem} className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-text-primary">Connectify</span>
          </motion.div>

          <motion.div variants={staggerItem}>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome back 👋</h1>
            <p className="text-text-muted mb-8">Sign in to your account to continue</p>
          </motion.div>

          {/* Social Logins */}
          <motion.div variants={staggerItem} className="flex gap-3 mb-6">
            <button className="flex-1 btn-secondary justify-center">
              <Globe2 className="w-4 h-4" />
              <span>Google</span>
            </button>
            <button className="flex-1 btn-secondary justify-center">
              <GitFork className="w-4 h-4" />
              <span>GitHub</span>
            </button>
          </motion.div>

          <motion.div variants={staggerItem} className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-surface/10" />
            <span className="text-text-faint text-sm">or</span>
            <div className="flex-1 h-px bg-surface/10" />
          </motion.div>

          {/* Form */}
          <motion.form variants={staggerItem} onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-text-muted mb-1.5 block">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-text-muted">Password</label>
                <a href="#" className="text-xs text-accent-light hover:text-accent-primary transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm">
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full justify-center"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign in
            </Button>
          </motion.form>

          <motion.p variants={staggerItem} className="mt-6 text-center text-text-muted text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-accent-light hover:text-accent-primary transition-colors font-medium">
              Create one free
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}

export default Login
