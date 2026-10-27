import { Link } from 'react-router'
import { Eye, Pencil } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import type { SortDirection } from '@/lib/list-params'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RowAction } from '@/components/common/row-action'
import { SortableTableHead } from '@/components/common/sortable-table-head'
import { UNAVAILABLE_APPLICATION_LABEL } from '../model/constants'
import type { Demand, DemandSortField } from '../model/types'
import { DemandPriorityBadge, DemandStatusBadge } from './demand-badges'

interface DemandsTableProps {
  demands: Demand[]
  sortField: DemandSortField
  sortDirection: SortDirection
  onSortChange: (field: DemandSortField) => void
  /** "manage": acciones de detalle y modificación; "select": botón de selección. */
  mode?: 'manage' | 'select'
  onSelect?: (demand: Demand) => void
  isFetching?: boolean
}

export function DemandsTable({
  demands,
  sortField,
  sortDirection,
  onSortChange,
  mode = 'manage',
  onSelect,
  isFetching,
}: DemandsTableProps) {
  const sortProps = { sortField, sortDirection, onSortChange }

  return (
    <Table className={cn('transition-opacity', isFetching && 'opacity-60')} aria-busy={isFetching}>
      <TableHeader className="bg-muted/50">
        <TableRow className="hover:bg-transparent">
          <SortableTableHead field="id" label="ID" className="w-20 pl-4" {...sortProps} />
          <SortableTableHead field="title" label="Título" {...sortProps} />
          <SortableTableHead field="application.name" label="Aplicación" {...sortProps} />
          <SortableTableHead field="priority" label="Prioridad" {...sortProps} />
          <SortableTableHead field="status" label="Estado" {...sortProps} />
          <SortableTableHead field="updatedAt" label="Actualizada" className="hidden xl:table-cell" {...sortProps} />
          <TableHead className="w-28 pr-4 text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {demands.map((demand) => (
          <TableRow key={demand.id}>
            <TableCell className="pl-4 font-mono text-xs text-muted-foreground">#{demand.id}</TableCell>
            <TableCell className="max-w-[12rem] truncate font-medium lg:max-w-[20rem]" title={demand.title}>
              {demand.title}
            </TableCell>
            <TableCell>
              <Link
                to={`/aplicaciones/${demand.applicationId}`}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {demand.applicationName ?? UNAVAILABLE_APPLICATION_LABEL}
              </Link>
            </TableCell>
            <TableCell>
              <DemandPriorityBadge priority={demand.priority} />
            </TableCell>
            <TableCell>
              <DemandStatusBadge status={demand.status} />
            </TableCell>
            <TableCell
              className="hidden text-sm text-muted-foreground tabular-nums xl:table-cell"
              title={formatDateTime(demand.updatedAt, 'long')}
            >
              {formatDateTime(demand.updatedAt)}
            </TableCell>
            <TableCell className="pr-4 text-right">
              {mode === 'select' ? (
                <Button size="sm" variant="outline" onClick={() => onSelect?.(demand)}>
                  <Pencil /> Seleccionar
                </Button>
              ) : (
                <div className="flex justify-end gap-1">
                  <RowAction to={`/demandas/${demand.id}`} label={`Ver detalle de la demanda #${demand.id}`}>
                    <Eye />
                  </RowAction>
                  <RowAction to={`/demandas/${demand.id}/editar`} label={`Modificar la demanda #${demand.id}`}>
                    <Pencil />
                  </RowAction>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
