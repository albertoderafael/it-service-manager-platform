import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Par etiqueta/valor para fichas de detalle (dentro de un <dl>). */
export function DetailField({
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

/** Texto largo opcional con marcador cuando está vacío. */
export function LongText({ value, emptyText = 'Sin descripción' }: { value: string | null; emptyText?: string }) {
  return value ? (
    <p className="text-sm leading-relaxed whitespace-pre-line">{value}</p>
  ) : (
    <span className="text-sm text-muted-foreground italic">{emptyText}</span>
  )
}
