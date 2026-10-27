import { Skeleton } from '@/components/ui/skeleton'

/** Esqueleto de carga genérico para tablas de listado. */
export function TableSkeleton({ rows = 5, label = 'Cargando…' }: { rows?: number; label?: string }) {
  return (
    <div className="divide-y" role="status" aria-label={label}>
      <div className="flex h-11 items-center gap-6 bg-muted/50 px-4">
        {[12, 28, 40, 20, 16].map((w, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${w * 0.25}rem` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-14 items-center gap-6 px-4">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  )
}
