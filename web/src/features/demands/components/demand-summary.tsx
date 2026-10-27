import { Link } from 'react-router'

import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import { DetailField, LongText } from '@/components/common/detail-field'
import { UNAVAILABLE_APPLICATION_LABEL } from '../model/constants'
import type { Demand } from '../model/types'
import { DemandPriorityBadge, DemandStatusBadge } from './demand-badges'

/** Ficha de solo lectura con todos los datos de DemandResponse. */
export function DemandSummary({
  demand,
  columns = 2,
  className,
}: {
  demand: Demand
  /** Número de columnas en pantallas medianas o superiores. */
  columns?: 1 | 2
  className?: string
}) {
  const twoColumns = columns === 2
  const fullWidth = twoColumns ? 'sm:col-span-2' : undefined

  return (
    <dl className={cn('grid gap-x-8 gap-y-5', twoColumns && 'sm:grid-cols-2', className)}>
      <DetailField label="Identificador">
        <span className="font-mono text-sm">#{demand.id}</span>
      </DetailField>
      <DetailField label="Aplicación">
        <Link
          to={`/aplicaciones/${demand.applicationId}`}
          className="font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          {demand.applicationName ?? UNAVAILABLE_APPLICATION_LABEL}
        </Link>
        <span className="ml-2 font-mono text-xs text-muted-foreground">#{demand.applicationId}</span>
      </DetailField>
      <DetailField label="Título" className={fullWidth}>
        <span className="font-medium">{demand.title}</span>
      </DetailField>
      <DetailField label="Prioridad">
        <DemandPriorityBadge priority={demand.priority} />
      </DetailField>
      <DetailField label="Estado">
        <DemandStatusBadge status={demand.status} />
      </DetailField>
      <DetailField label="Creada">
        <time dateTime={demand.createdAt} className="text-sm tabular-nums">
          {formatDateTime(demand.createdAt, 'long')}
        </time>
      </DetailField>
      <DetailField label="Última actualización">
        <time dateTime={demand.updatedAt} className="text-sm tabular-nums">
          {formatDateTime(demand.updatedAt, 'long')}
        </time>
      </DetailField>
      <DetailField label="Descripción" className={fullWidth}>
        <LongText value={demand.description} />
      </DetailField>
    </dl>
  )
}
