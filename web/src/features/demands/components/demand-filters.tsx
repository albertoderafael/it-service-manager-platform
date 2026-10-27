import { FilterX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FilterSelect } from '@/components/common/filter-select'
import { DEMAND_PRIORITY_LABELS, DEMAND_STATUS_LABELS } from '../model/constants'
import {
  DEMAND_PRIORITIES,
  DEMAND_STATUSES,
  type DemandPriority,
  type DemandStatus,
} from '../model/types'
import { useApplicationSelectOptions } from './application-options'

const STATUS_OPTIONS = DEMAND_STATUSES.map((value) => ({
  value,
  label: DEMAND_STATUS_LABELS[value],
  hint: value,
}))

const PRIORITY_OPTIONS = DEMAND_PRIORITIES.map((value) => ({
  value,
  label: DEMAND_PRIORITY_LABELS[value],
  hint: value,
}))

export interface DemandFilterValues {
  applicationId?: number
  status?: DemandStatus
  priority?: DemandPriority
}

interface DemandFiltersProps extends DemandFilterValues {
  onChange: (filters: DemandFilterValues) => void
}

/** Filtros opcionales y combinables por aplicación, estado y prioridad. */
export function DemandFilters({ applicationId, status, priority, onChange }: DemandFiltersProps) {
  const { query, options } = useApplicationSelectOptions()
  const hasFilters = applicationId !== undefined || !!status || !!priority
  const current = { applicationId, status, priority }

  const applicationOptions = options.map((o) => ({
    value: o.value,
    label: o.name,
    hint: o.inactive ? 'inactiva' : undefined,
  }))

  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <FilterSelect
        id="filter-application"
        label="Aplicación"
        allLabel="Todas las aplicaciones"
        value={applicationId !== undefined ? String(applicationId) : undefined}
        options={applicationOptions}
        onChange={(value) => onChange({ ...current, applicationId: value ? Number(value) : undefined })}
        disabled={query.isPending}
        placeholder={query.isError ? 'No disponible' : 'Cargando…'}
        className="sm:w-52"
      />
      <FilterSelect
        id="filter-demand-status"
        label="Estado"
        allLabel="Todos los estados"
        value={status}
        options={STATUS_OPTIONS}
        onChange={(value) => onChange({ ...current, status: value })}
        className="sm:w-52"
      />
      <FilterSelect
        id="filter-demand-priority"
        label="Prioridad"
        allLabel="Todas las prioridades"
        value={priority}
        options={PRIORITY_OPTIONS}
        onChange={(value) => onChange({ ...current, priority: value })}
        className="sm:w-52"
      />
      <Button
        variant="ghost"
        onClick={() => onChange({ applicationId: undefined, status: undefined, priority: undefined })}
        disabled={!hasFilters}
        className="sm:ml-auto"
      >
        <FilterX /> Limpiar filtros
      </Button>
    </div>
  )
}
