export function Skeleton({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`relative block overflow-hidden rounded bg-surface-subtle
                  before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer
                  before:bg-gradient-to-r before:from-transparent before:via-black/[0.04] before:to-transparent
                  dark:before:via-white/[0.06] ${className}`}
    />
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card p-5">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-2 h-3 w-40" />
      <div className="mt-6 flex h-[188px] items-end gap-2">
        {[38, 62, 45, 78, 55, 88, 42, 70, 50, 82, 60, 35, 74, 48].map((height, i) => (
          <span key={i} className="flex-1" style={{ height: `${height}%` }}>
            <Skeleton className="h-full w-full rounded-t" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="divide-y divide-hairline">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={`h-3.5 ${c === 0 ? 'w-16' : c === 1 ? 'flex-1' : 'w-20'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ProductListSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-hairline">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-3.5 w-10" />
        </div>
      ))}
    </div>
  );
}
