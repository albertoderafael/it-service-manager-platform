import { Eye, Pencil } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SortableTableHead } from '@/components/common/sortable-table-head'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RowAction } from '@/components/common/row-action'
import type { SortDirection } from '@/lib/list-params'
import type { Application, ApplicationSortField } from '../model/types'
import { CriticalityBadge, StatusBadge } from './application-badges'

interface ApplicationsTableProps {
  applications: Application[]
  sortField: ApplicationSortField
  sortDirection: SortDirection
  onSortChange: (field: ApplicationSortField) => void
  /** "manage": acciones de detalle y modificación; "select": botón de selección. */
  mode?: 'manage' | 'select'
  onSelect?: (application: Application) => void
  /** Atenúa la tabla mientras se carga otra página. */
  isFetching?: boolean
}

export function ApplicationsTable({
  applications,
  sortField,
  sortDirection,
  onSortChange,
  mode = 'manage',
  onSelect,
  isFetching,
}: ApplicationsTableProps) {
  const sortProps = { sortField, sortDirection, onSortChange }

  return (
    <Table className={cn('transition-opacity', isFetching && 'opacity-60')} aria-busy={isFetching}>
      <TableHeader className="bg-muted/50">
        <TableRow className="hover:bg-transparent">
          <SortableTableHead field="id" label="ID" className="w-20 pl-4" {...sortProps} />
          <SortableTableHead field="name" label="Nombre" {...sortProps} />
          <TableHead>Descripción</TableHead>
          <SortableTableHead field="criticality" label="Criticidad" {...sortProps} />
          <SortableTableHead field="status" label="Estado" {...sortProps} />
          <TableHead className="w-28 pr-4 text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.map((app) => (
          <TableRow key={app.id}>
            <TableCell className="pl-4 font-mono text-xs text-muted-foreground">#{app.id}</TableCell>
            <TableCell className="font-medium">{app.name}</TableCell>
            <TableCell className="max-w-[22rem] truncate text-muted-foreground" title={app.description ?? ''}>
              {app.description || <span className="italic opacity-70">—</span>}
            </TableCell>
            <TableCell>
              <CriticalityBadge criticality={app.criticality} />
            </TableCell>
            <TableCell>
              <StatusBadge status={app.status} />
            </TableCell>
            <TableCell className="pr-4 text-right">
              {mode === 'select' ? (
                <Button size="sm" variant="outline" onClick={() => onSelect?.(app)}>
                  <Pencil /> Seleccionar
                </Button>
              ) : (
                <div className="flex justify-end gap-1">
                  <RowAction to={`/aplicaciones/${app.id}`} label={`Ver detalle de ${app.name}`}>
                    <Eye />
                  </RowAction>
                  <RowAction to={`/aplicaciones/${app.id}/editar`} label={`Modificar ${app.name}`}>
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
