import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2, RefreshCw, WifiOff } from 'lucide-react'

import { cn } from '@/lib/utils'
import { getErrorMessage, isApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

interface StateViewProps {
  className?: string
  title?: string
  description?: ReactNode
  action?: ReactNode
}

export function LoadingState({ className, title = 'Cargando…' }: StateViewProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-6 animate-spin text-brand-strong" />
      <p className="text-sm">{title}</p>
    </div>
  )
}

export function EmptyState({
  className,
  title = 'Sin resultados',
  description,
  action,
}: StateViewProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-16 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

interface ErrorStateProps extends StateViewProps {
  error: unknown
  onRetry?: () => void
}

export function ErrorState({ className, error, onRetry, title, action }: ErrorStateProps) {
  const isNetwork = isApiError(error) && error.kind === 'network'
  const Icon = isNetwork ? WifiOff : AlertTriangle
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}
      role="alert"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <Icon className="size-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">
          {title ?? (isNetwork ? 'Sin conexión con el servidor' : 'No se han podido cargar los datos')}
        </p>
        <p className="max-w-md text-sm text-muted-foreground">{getErrorMessage(error)}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw /> Reintentar
          </Button>
        )}
        {action}
      </div>
    </div>
  )
}
