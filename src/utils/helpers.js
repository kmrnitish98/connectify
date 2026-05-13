import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export const getStatusColor = (status) => {
  const colors = {
    online: 'bg-status-online',
    away: 'bg-status-away',
    busy: 'bg-status-busy',
    offline: 'bg-status-offline',
  }
  return colors[status] || colors.offline
}

export const formatTime = (date) => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export const getAvatarGradient = (name) => {
  const gradients = [
    'from-purple-500 to-indigo-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-pink-500 to-rose-500',
    'from-violet-500 to-purple-500',
  ]
  const index = (name?.charCodeAt(0) || 0) % gradients.length
  return gradients[index]
}

export const sleep = (ms) => new Promise(r => setTimeout(r, ms))
