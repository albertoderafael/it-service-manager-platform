import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { SortDirection } from '@/lib/list-params'
import { TableHead } from '@/components/ui/table'

interface SortableTableHeadProps<F extends string> {
  field: F
  label: string
  className?: string
  sortField: F
  sortDirection: SortDirection
  onSortChange: (field: F) => void
}

/** Cabecera de columna que ordena el listado al pulsarla (alterna asc/desc). */
export function SortableTableHead<F extends string>({
  field,
  label,
  className,
  sortField,
  sortDirection,
  onSortChange,
}: SortableTableHeadProps<F>) {
  const active = sortField === field
  const Icon = !active ? ArrowUpDown : sortDirection === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead
      className={className}
      aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSortChange(field)}
        className={cn(
          '-ml-2 inline-flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 uppercase transition-colors hover:bg-muted hover:text-foreground',
          active && 'text-foreground',
        )}
      >
        {label}
        <Icon className={cn('size-3.5', active ? 'text-brand-strong' : 'opacity-50')} />
      </button>
    </TableHead>
  )
}
