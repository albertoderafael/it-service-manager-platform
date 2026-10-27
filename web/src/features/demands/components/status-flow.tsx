import { ArrowRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { DEMAND_STATUS_LABELS } from '../model/constants'
import { getNextStatuses, isFinalStatus } from '../model/status-rules'
import type { DemandStatus } from '../model/types'

const FLOW: readonly DemandStatus[] = ['OPEN', 'IN_PROGRESS', 'COMPLETED']

/**
 * Ciclo de vida de una demanda: resalta el estado actual y los estados
 * a los que puede pasar. Cancelada es una salida posible desde Abierta y En curso.
 */
export function StatusFlow({ current, className }: { current: DemandStatus; className?: string }) {
  const next = getNextStatuses(current)

  const chip = (status: DemandStatus) => (
    <span
      key={status}
      className={cn(
        'rounded-md border px-2 py-1 text-xs font-medium whitespace-nowrap',
        status === current && 'border-primary bg-primary text-primary-foreground',
        next.includes(status) && 'border-brand-strong border-dashed bg-accent text-accent-foreground',
        status !== current && !next.includes(status) && 'border-border text-muted-foreground opacity-60',
      )}
      aria-current={status === current ? 'step' : undefined}
    >
      {DEMAND_STATUS_LABELS[status]}
    </span>
  )

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {FLOW.map((status, index) => (
          <span key={status} className="flex items-center gap-1.5">
            {index > 0 && <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
            {chip(status)}
          </span>
        ))}
        <span className="mx-1 text-xs text-muted-foreground">·</span>
        {chip('CANCELLED')}
      </div>
      <p className="text-xs text-muted-foreground">
        {isFinalStatus(current)
          ? `«${DEMAND_STATUS_LABELS[current]}» es un estado final: no admite más cambios de estado.`
          : `Desde «${DEMAND_STATUS_LABELS[current]}» puede pasar a ${next
              .map((s) => `«${DEMAND_STATUS_LABELS[s]}»`)
              .join(' o ')}.`}
      </p>
    </div>
  )
}
