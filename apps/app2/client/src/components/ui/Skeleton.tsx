interface SkeletonProps {
  className?: string
}

/**
 * Loading placeholder.
 *
 * Uses the same neutral alpha fill as the chart bar placeholders in the export,
 * so a loading card and a sparse card look like the same surface.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-control bg-fill ${className}`}
    />
  )
}

/** A block of stacked lines, for text-shaped loading states. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <span className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          // The last line is short, the way a real paragraph ends.
          className={`h-3 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </span>
  )
}
