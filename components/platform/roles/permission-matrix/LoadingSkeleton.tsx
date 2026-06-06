'use client'

export function LoadingSkeleton(): JSX.Element {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-16 rounded bg-gray-200"></div>
      <div className="h-64 rounded bg-gray-200"></div>
    </div>
  )
}
