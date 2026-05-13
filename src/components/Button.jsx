import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '../utils/helpers'

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2',
    success: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2',
  }

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm',
    lg: 'text-base px-6 py-3',
    xl: 'text-lg px-8 py-4',
  }

  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
      className={cn(variants[variant], sizes[size], className, {
        'opacity-50 cursor-not-allowed': disabled || isLoading,
      })}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : leftIcon ? (
        leftIcon
      ) : null}
      {children}
      {!isLoading && rightIcon}
    </motion.button>
  )
}

export default Button
