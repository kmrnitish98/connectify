import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Zap, MessageSquare, Video, Shield, Globe, Sparkles,
  ArrowRight, Check, ChevronDown, Star, Play,
  Mic, Lock, BarChart3
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { staggerContainer, staggerItem, floatAnimation } from '../animations/variants'

const FEATURES = [
  { icon: MessageSquare, title: 'Real-time Messaging', desc: 'Instant messages with typing indicators, read receipts, and rich media support.', color: 'from-blue-500 to-cyan-500' },
  { icon: Video, title: 'Crystal-Clear Video', desc: 'HD video calls with noise cancellation, screen sharing, and virtual backgrounds.', color: 'from-accent-primary to-accent-secondary' },
  { icon: Shield, title: 'End-to-End Encrypted', desc: 'Your conversations are private. Military-grade encryption keeps your data safe.', color: 'from-emerald-500 to-teal-500' },
  { icon: Globe, title: 'Works Everywhere', desc: 'Native apps for iOS, Android, macOS, Windows, and a powerful web client.', color: 'from-orange-500 to-amber-500' },
  { icon: Sparkles, title: 'AI Assistant', desc: 'Built-in AI that summarizes threads, suggests replies, and translates in real-time.', color: 'from-pink-500 to-rose-500' },
  { icon: BarChart3, title: 'Analytics & Insights', desc: 'Track team engagement, response times, and communication patterns.', color: 'from-violet-500 to-purple-500' },
]

const TESTIMONIALS = [
  { name: 'Sarah Chen', role: 'CTO at Luminary', text: 'Connectify has transformed how our remote team works. The video quality is incredible and the AI features save us hours every week.', rating: 5 },
  { name: 'Marcus Rivera', role: 'Product Lead at Orbit', text: 'Switched from Slack and never looked back. The UI is stunning and the performance is blazing fast. Our team absolutely loves it.', rating: 5 },
  { name: 'Priya Patel', role: 'Founder at Nexlabs', text: "The best communication platform for modern teams. It's like Discord and Slack had a beautiful, productive baby.", rating: 5 },
]

const PLANS = [
  { name: 'Starter', price: 0, features: ['Up to 10 members', '5GB storage', 'HD video calls', '1-on-1 messaging', 'Mobile apps'] },
  { name: 'Pro', price: 12, popular: true, features: ['Unlimited members', '100GB storage', '4K video calls', 'Group channels', 'AI assistant', 'Analytics', 'Priority support'] },
  { name: 'Enterprise', price: 49, features: ['Everything in Pro', '1TB storage', 'Custom integrations', 'SSO / SAML', 'SLA guarantee', 'Dedicated support', 'Custom contracts'] },
]

const FAQS = [
  { q: 'Is there a free plan?', a: 'Yes! Our Starter plan is completely free and includes all core features for small teams up to 10 members.' },
  { q: 'How secure is Connectify?', a: 'All messages and calls are end-to-end encrypted using AES-256. We are SOC 2 Type II certified and GDPR compliant.' },
  { q: 'Can I migrate from Slack or Discord?', a: 'Absolutely! We offer free migration assistance and our import tools support Slack, Discord, Teams, and more.' },
  { q: 'Do you offer a self-hosted option?', a: 'Yes, Enterprise customers can deploy Connectify on their own infrastructure for complete data sovereignty.' },
]

const Landing = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background Orbs */}
        <div className="orb w-[600px] h-[600px] bg-accent-primary top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/4 opacity-10" />
        <div className="orb w-80 h-80 bg-accent-secondary top-0 right-0 opacity-10" />
        <div className="orb w-64 h-64 bg-pink-500 bottom-0 left-0 opacity-10" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div variants={staggerContainer} initial="initial" animate="animate">
            <motion.div variants={staggerItem} className="inline-flex items-center gap-2 bg-accent-primary/10 border border-accent-primary/20 text-accent-light rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Now with AI-powered features</span>
            </motion.div>

            <motion.h1 variants={staggerItem} className="text-5xl sm:text-6xl lg:text-7xl font-display font-extrabold mb-6 leading-tight tracking-tight">
              Connect your team,
              <br />
              <span className="gradient-text">without limits</span>
            </motion.h1>

            <motion.p variants={staggerItem} className="text-xl text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
              The all-in-one platform for modern teams. Real-time chat, HD video calling, file sharing, and AI assistance — beautifully designed.
            </motion.p>

            <motion.div variants={staggerItem} className="flex items-center justify-center gap-4 flex-wrap">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/signup')}
                className="btn-primary text-base px-8 py-3.5 shadow-glow"
              >
                Get started free
                <ArrowRight className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="btn-secondary text-base px-8 py-3.5"
              >
                <Play className="w-4 h-4" />
                Watch demo
              </motion.button>
            </motion.div>

            <motion.p variants={staggerItem} className="mt-4 text-text-faint text-sm">
              Free forever · No credit card required · Setup in 2 minutes
            </motion.p>
          </motion.div>

          {/* App Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 relative max-w-5xl mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent z-10 bottom-0 h-1/3 pointer-events-none" style={{ top: 'auto' }} />
            <div className="glass-card rounded-2xl overflow-hidden border border-surface/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
              {/* Mock window bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-surface/5 bg-bg-secondary/50">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <div className="flex-1 flex justify-center">
                  <div className="bg-bg-tertiary rounded-lg px-8 py-1 text-text-faint text-xs">app.connectify.io</div>
                </div>
              </div>
              {/* Mock App UI */}
              <div className="flex h-80 bg-bg-primary">
                {/* Sidebar Preview */}
                <div className="w-56 border-r border-surface/5 bg-bg-secondary p-3 space-y-1">
                  {['Sarah Chen', 'Marcus Rivera', 'Dev Team', 'Priya Patel', 'Design Guild'].map((name, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${i === 0 ? 'bg-accent-primary/10' : 'hover:bg-surface/5'}`}>
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${['from-purple-500 to-indigo-500','from-blue-500 to-cyan-500','from-emerald-500 to-teal-500','from-orange-500 to-amber-500','from-pink-500 to-rose-500'][i]}`}>
                        {name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="skeleton h-2.5 rounded w-3/4 mb-1" />
                        <div className="skeleton h-2 rounded w-1/2" />
                      </div>
                      {i < 2 && <div className="w-4 h-4 rounded-full bg-accent-primary flex items-center justify-center text-white text-xs">{i === 0 ? 3 : 1}</div>}
                    </div>
                  ))}
                </div>
                {/* Chat Preview */}
                <div className="flex-1 flex flex-col">
                  <div className="border-b border-surface/5 px-4 py-2 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">SC</div>
                    <span className="text-text-primary text-sm font-medium">Sarah Chen</span>
                    <span className="w-2 h-2 rounded-full bg-status-online ml-1" />
                  </div>
                  <div className="flex-1 p-4 space-y-3">
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex-shrink-0" />
                      <div className="bg-bg-tertiary rounded-2xl rounded-bl-sm px-3 py-2 max-w-[60%]">
                        <div className="skeleton h-2.5 rounded w-40 mb-1" />
                        <div className="skeleton h-2.5 rounded w-28" />
                      </div>
                    </div>
                    <div className="flex gap-2 flex-row-reverse">
                      <div className="bg-accent-primary rounded-2xl rounded-br-sm px-3 py-2 max-w-[55%]">
                        <div className="h-2.5 rounded w-32 mb-1 bg-surface/30" />
                        <div className="h-2.5 rounded w-20 bg-surface/30" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex-shrink-0" />
                      <div className="bg-bg-tertiary rounded-2xl rounded-bl-sm px-3 py-2 max-w-[50%]">
                        <div className="skeleton h-2.5 rounded w-24" />
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-surface/5 px-4 py-2">
                    <div className="bg-bg-tertiary rounded-xl px-3 py-2 flex items-center gap-2">
                      <div className="skeleton flex-1 h-2.5 rounded w-32" />
                      <div className="w-7 h-7 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                        <div className="w-3 h-3 rounded bg-accent-primary/60" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-8 top-20 glass-card rounded-xl p-3 hidden lg:flex items-center gap-2 shadow-card"
            >
              <div className="w-8 h-8 rounded-full bg-status-online/20 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-status-online" />
              </div>
              <div>
                <p className="text-text-primary text-xs font-semibold">1,248 online</p>
                <p className="text-text-faint text-xs">right now</p>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -right-8 top-16 glass-card rounded-xl p-3 hidden lg:flex items-center gap-2 shadow-card"
            >
              <Video className="w-5 h-5 text-accent-light" />
              <div>
                <p className="text-text-primary text-xs font-semibold">HD Video Call</p>
                <p className="text-text-faint text-xs">Crystal clear</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="inline-flex items-center gap-2 bg-accent-primary/10 border border-accent-primary/20 text-accent-light rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>Everything you need</span>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-4xl lg:text-5xl font-display font-bold mb-4">
            Built for <span className="gradient-text">modern teams</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-text-muted text-lg max-w-2xl mx-auto">
            Everything your team needs to communicate, collaborate, and ship faster.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="feature-card"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg`}>
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-text-primary font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl font-display font-bold mb-4">
              Loved by <span className="gradient-text">10,000+ teams</span>
            </motion.h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-card rounded-2xl p-6 border border-surface/5">
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-text-muted text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white text-xs font-bold">
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-text-primary text-sm font-medium">{t.name}</p>
                    <p className="text-text-faint text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl font-display font-bold mb-4">
            Simple, <span className="gradient-text">transparent pricing</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-text-muted text-lg">
            Start free, scale as you grow. No hidden fees.
          </motion.p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan, i) => (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-xs font-bold px-4 py-1 rounded-full">Most Popular</div>
              )}
              <h3 className="text-text-primary font-bold text-xl mb-2">{plan.name}</h3>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-display font-extrabold text-text-primary">${plan.price}</span>
                <span className="text-text-muted text-sm mb-1">/user/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-muted">
                    <Check className="w-4 h-4 text-accent-light flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/signup')}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${plan.popular ? 'btn-primary justify-center' : 'btn-secondary justify-center'}`}
              >
                {plan.price === 0 ? 'Get started free' : 'Start free trial'}
              </motion.button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-bg-secondary/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl font-display font-bold mb-4">
              Frequently asked <span className="gradient-text">questions</span>
            </motion.h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <FaqItem key={i} faq={faq} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="orb w-96 h-96 bg-accent-primary left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-15" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-5xl font-display font-extrabold mb-6">
            Ready to <span className="gradient-text">transform</span> how you communicate?
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-text-muted text-lg mb-8">
            Join 10,000+ teams already using Connectify. Start for free today.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex items-center justify-center gap-4">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/signup')} className="btn-primary text-base px-8 py-3.5 shadow-glow animate-glow">
              Start for free <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface/5 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display font-bold text-text-primary">Connectify</span>
            </div>
            <div className="flex gap-8 text-text-faint text-sm">
              {['Privacy', 'Terms', 'Security', 'Status', 'Docs', 'Blog'].map(l => (
                <a key={l} href="#" className="hover:text-text-muted transition-colors">{l}</a>
              ))}
            </div>
            <p className="text-text-faint text-sm">© 2026 Connectify. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

const FaqItem = ({ faq, i }) => {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.05 }}
      className="glass-card rounded-xl border border-surface/5 overflow-hidden"
    >
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <span className="text-text-primary font-medium text-sm">{faq.q}</span>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-5 pb-4">
          <p className="text-text-muted text-sm leading-relaxed">{faq.a}</p>
        </motion.div>
      )}
    </motion.div>
  )
}

export default Landing
