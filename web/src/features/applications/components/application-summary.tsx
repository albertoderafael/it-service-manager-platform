import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import type { Application } from '../model/types'
import { CriticalityBadge, StatusBadge } from './application-badges'

/** Ficha de solo lectura con los datos de una aplicación devueltos por la API. */
export function ApplicationSummary({
  application,
  columns = 2,
  className,
}: {
  application: Application
  /** Número de columnas en pantallas medianas o superiores. */
  columns?: 1 | 2
  className?: string
}) {
  const twoColumns = columns === 2
  return (
    <dl className={cn('grid gap-x-8 gap-y-5', twoColumns && 'sm:grid-cols-2', className)}>
      <Field label="Identificador">
        <span className="font-mono text-sm">#{application.id}</span>
      </Field>
      <Field label="Nombre">
        <span className="font-medium">{application.name}</span>
      </Field>
      <Field label="Criticidad">
        <CriticalityBadge criticality={application.criticality} />
      </Field>
      <Field label="Estado">
        <StatusBadge status={application.status} />
      </Field>
      <Field label="Descripción" className={twoColumns ? 'sm:col-span-2' : undefined}>
        {application.description ? (
          <p className="text-sm leading-relaxed whitespace-pre-line">{application.description}</p>
        ) : (
          <span className="text-sm text-muted-foreground italic">Sin descripción</span>
        )}
      </Field>
    </dl>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
