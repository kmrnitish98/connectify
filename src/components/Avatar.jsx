import { motion } from 'framer-motion'
import { getInitials, getAvatarGradient, getStatusColor, cn } from '../utils/helpers'

const Avatar = ({ name, src, size = 'md', status, className }) => {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
  }

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div className={cn('rounded-full flex items-center justify-center font-semibold', sizes[size])}>
        {src ? (
          <img src={src} alt={name} className={cn('avatar', sizes[size])} />
        ) : (
          <div className={cn(
            'rounded-full flex items-center justify-center font-bold bg-gradient-to-br',
            getAvatarGradient(name),
            sizes[size]
          )}>
            <span className="text-white">{getInitials(name)}</span>
          </div>
        )}
      </div>
      {status && (
        <span className={cn('status-dot', getStatusColor(status))} />
      )}
    </div>
  )
}

export default Avatar
