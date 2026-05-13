import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import Button from '../components/Button'
import ConnectifyLogo from '../components/ConnectifyLogo'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '#about' },
  { label: 'FAQ', href: '#faq' },
]

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-bg-primary/90 backdrop-blur-xl border-b border-surface/5 shadow-glass' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" aria-label="Connectify Home">
            <ConnectifyLogo size={34} showText={true} />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <a key={link.label} href={link.href} className="nav-link">
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button variant="primary" onClick={() => navigate('/signup')}>
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-text-muted hover:text-text-primary"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-bg-primary/95 backdrop-blur-xl border-b border-surface/5 px-4 py-4 space-y-3"
        >
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="block py-2 text-text-muted hover:text-text-primary transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-surface/5">
            <Button variant="ghost" onClick={() => { navigate('/login'); setMenuOpen(false) }}>Login</Button>
            <Button variant="primary" onClick={() => { navigate('/signup'); setMenuOpen(false) }}>Get Started</Button>
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}

export default Navbar
