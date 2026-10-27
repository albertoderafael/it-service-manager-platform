import { cn } from '@/lib/utils'

/*
 * Indicadores visuales reutilizables por todos los módulos:
 * - StatusPill: estado con punto de color (activa, abierta, completada…).
 * - LevelBadge: nivel de 1 a 4 con barras (criticidad, prioridad…).
 */

export type Tone = 'success' | 'neutral' | 'info' | 'brand' | 'warning' | 'danger'

const PILL_TONES: Record<Tone, { pill: string; dot: string }> = {
  success: { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  neutral: { pill: 'bg-slate-100 text-slate-600 ring-slate-500/20', dot: 'bg-slate-400' },
  info: { pill: 'bg-sky-50 text-sky-700 ring-sky-600/20', dot: 'bg-sky-500' },
  brand: { pill: 'bg-cyan-50 text-cyan-800 ring-cyan-600/25', dot: 'bg-cyan-500' },
  warning: { pill: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  danger: { pill: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500' },
}

export function StatusPill({
  label,
  tone,
  title,
  className,
}: {
  label: string
  tone: Tone
  title?: string
  className?: string
}) {
  const style = PILL_TONES[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        style.pill,
        className,
      )}
      title={title}
    >
      <span className={cn('size-1.5 rounded-full', style.dot)} aria-hidden="true" />
      {label}
    </span>
  )
}

export type Level = 1 | 2 | 3 | 4

const LEVEL_STYLES: Record<Level, { badge: string; bar: string }> = {
  1: { badge: 'bg-sky-50 text-sky-700 ring-sky-600/20', bar: 'bg-sky-500' },
  2: { badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', bar: 'bg-amber-500' },
  3: { badge: 'bg-orange-50 text-orange-700 ring-orange-600/25', bar: 'bg-orange-500' },
  4: { badge: 'bg-red-50 text-red-700 ring-red-600/25', bar: 'bg-red-600' },
}

export function LevelBadge({
  level,
  label,
  title,
  className,
}: {
  level: Level
  label: string
  title?: string
  className?: string
}) {
  const style = LEVEL_STYLES[level]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        style.badge,
        className,
      )}
      title={title}
    >
      <span className="flex items-end gap-[2px]" aria-hidden="true">
        {([1, 2, 3, 4] as const).map((n) => (
          <span
            key={n}
            className={cn('w-[3px] rounded-sm', n <= level ? style.bar : 'bg-current opacity-20')}
            style={{ height: 4 + n * 2 }}
          />
        ))}
      </span>
      {label}
    </span>
  )
}
