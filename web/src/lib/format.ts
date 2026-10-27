const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const longDateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'long',
  timeStyle: 'medium',
})

/** Formatea un instante ISO-8601 (p. ej. java.time.Instant) en hora local. */
export function formatDateTime(iso: string | null | undefined, style: 'short' | 'long' = 'short'): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return (style === 'long' ? longDateTimeFormatter : dateTimeFormatter).format(date)
}
