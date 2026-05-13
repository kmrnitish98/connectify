import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap, Mail, Lock, User, ArrowRight, GitFork, Globe2, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { staggerContainer, staggerItem } from '../animations/variants'
import Button from '../components/Button'
import toast from 'react-hot-toast'

const PasswordStrength = ({ password }) => {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
    { label: 'Symbol', ok: /[^A-Za-z0-9]/.test(password) },
  ]
  const strength = checks.filter(c => c.ok).length
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500']

  if (!password) return null
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < strength ? colors[strength - 1] : 'bg-surface/10'}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map(c => (
          <span key={c.label} className={`text-xs flex items-center gap-1 ${c.ok ? 'text-emerald-400' : 'text-text-faint'}`}>
            <Check className="w-3 h-3" />{c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

const Signup = () => {
  const navigate = useNavigate()
  const { signup, isLoading } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name || !email || !password) { setError('Please fill all fields'); return }
    if (!agreed) { setError('Please accept the terms'); return }
    const result = await signup(name, email, password)
    if (result.success) {
      toast.success('Account created! Welcome to Connectify 🎉')
      navigate('/home')
    } else {
      setError(result.message || 'Signup failed')
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <div className="orb w-96 h-96 bg-accent-primary top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <div className="orb w-64 h-64 bg-accent-secondary bottom-0 left-0 -translate-x-1/3 translate-y-1/3" />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="w-full max-w-md relative z-10"
      >
        <motion.div variants={staggerItem} className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-glow">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-text-primary">Connectify</span>
        </motion.div>

        <motion.div variants={staggerItem}>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Create your account</h1>
          <p className="text-text-muted mb-8">Join thousands of teams already using Connectify</p>
        </motion.div>

        <motion.div variants={staggerItem} className="flex gap-3 mb-6">
          <button className="flex-1 btn-secondary justify-center">
            <Globe2 className="w-4 h-4" /><span>Google</span>
          </button>
          <button className="flex-1 btn-secondary justify-center">
            <GitFork className="w-4 h-4" /><span>GitHub</span>
          </button>
        </motion.div>

        <motion.div variants={staggerItem} className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-surface/10" />
          <span className="text-text-faint text-sm">or</span>
          <div className="flex-1 h-px bg-surface/10" />
        </motion.div>

        <motion.form variants={staggerItem} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-text-muted mb-1.5 block">Full name</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Alex Johnson" className="input-field pl-10" autoComplete="name" />
            </div>
          </div>

          <div>
            <label className="text-sm text-text-muted mb-1.5 block">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input-field pl-10" autoComplete="email" />
            </div>
          </div>

          <div>
            <label className="text-sm text-text-muted mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input-field pl-10 pr-10" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setAgreed(!agreed)}
              className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${agreed ? 'bg-accent-primary border-accent-primary' : 'border-surface/20 hover:border-accent-primary/50'}`}
            >
              {agreed && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className="text-sm text-text-muted">
              I agree to the{' '}
              <a href="#" className="text-accent-light hover:text-accent-primary transition-colors">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-accent-light hover:text-accent-primary transition-colors">Privacy Policy</a>
            </span>
          </div>

          {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm">{error}</motion.p>}

          <Button type="submit" variant="primary" isLoading={isLoading} className="w-full justify-center" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Create account
          </Button>
        </motion.form>

        <motion.p variants={staggerItem} className="mt-6 text-center text-text-muted text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-light hover:text-accent-primary transition-colors font-medium">Sign in</Link>
        </motion.p>
      </motion.div>
    </div>
  )
}

export default Signup
