import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PaginationBarProps {
  /** Página actual, 0-based (como Spring Data). */
  page: number
  size: number
  totalElements: number
  totalPages: number
  pageSizeOptions: readonly number[]
  onPageChange: (page: number) => void
  onSizeChange: (size: number) => void
  disabled?: boolean
}

export function PaginationBar({
  page,
  size,
  totalElements,
  totalPages,
  pageSizeOptions,
  onPageChange,
  onSizeChange,
  disabled,
}: PaginationBarProps) {
  const from = totalElements === 0 ? 0 : page * size + 1
  const to = Math.min((page + 1) * size, totalElements)
  const isFirst = page <= 0
  const isLast = page >= totalPages - 1

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">
        Mostrando <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> de{' '}
        <span className="font-medium text-foreground">{totalElements}</span>
      </p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Filas por página</span>
          <Select
            value={String(size)}
            onValueChange={(value) => onSizeChange(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger size="sm" className="w-[72px]" aria-label="Filas por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-muted-foreground">
          Página <span className="font-medium text-foreground">{totalPages === 0 ? 0 : page + 1}</span>{' '}
          de <span className="font-medium text-foreground">{totalPages}</span>
        </span>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(0)} disabled={disabled || isFirst} aria-label="Primera página">
            <ChevronsLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page - 1)} disabled={disabled || isFirst} aria-label="Página anterior">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(page + 1)} disabled={disabled || isLast} aria-label="Página siguiente">
            <ChevronRight />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => onPageChange(totalPages - 1)} disabled={disabled || isLast} aria-label="Última página">
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
