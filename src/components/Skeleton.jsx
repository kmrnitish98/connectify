import { cn } from '../utils/helpers'

const SkeletonLine = ({ className }) => (
  <div className={cn('skeleton rounded-lg h-4', className)} />
)

export const ChatListSkeleton = () => (
  <div className="space-y-2 p-2">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
        <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="w-3/4" />
          <SkeletonLine className="w-1/2 h-3" />
        </div>
      </div>
    ))}
  </div>
)

export const MessageSkeleton = () => (
  <div className="space-y-4 p-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className={`flex items-end gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
        <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
        <div className={`space-y-1 max-w-[60%] ${i % 2 === 0 ? '' : 'items-end flex flex-col'}`}>
          <div className="skeleton h-10 rounded-2xl w-48" />
          <div className="skeleton h-3 rounded w-16" />
        </div>
      </div>
    ))}
  </div>
)

export const ProfileSkeleton = () => (
  <div className="space-y-3 p-4">
    <div className="flex items-center gap-3">
      <div className="skeleton w-12 h-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <SkeletonLine className="w-1/2" />
        <SkeletonLine className="w-1/3 h-3" />
      </div>
    </div>
  </div>
)

export default SkeletonLine
