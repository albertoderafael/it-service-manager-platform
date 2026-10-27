import { FilterX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FilterSelect } from '@/components/common/filter-select'
import { CRITICALITY_LABELS, STATUS_LABELS } from '../model/constants'
import {
  APPLICATION_CRITICALITIES,
  APPLICATION_STATUSES,
  type ApplicationCriticality,
  type ApplicationStatus,
} from '../model/types'

const STATUS_OPTIONS = APPLICATION_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
  hint: value,
}))

const CRITICALITY_OPTIONS = APPLICATION_CRITICALITIES.map((value) => ({
  value,
  label: CRITICALITY_LABELS[value],
  hint: value,
}))

interface ApplicationFiltersProps {
  status?: ApplicationStatus
  criticality?: ApplicationCriticality
  onChange: (filters: { status?: ApplicationStatus; criticality?: ApplicationCriticality }) => void
}

/** Filtros opcionales y combinables. Cada cambio lanza una nueva consulta a la API. */
export function ApplicationFilters({ status, criticality, onChange }: ApplicationFiltersProps) {
  const hasFilters = !!status || !!criticality

  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <FilterSelect
        id="filter-status"
        label="Estado"
        allLabel="Todos los estados"
        value={status}
        options={STATUS_OPTIONS}
        onChange={(value) => onChange({ status: value, criticality })}
      />
      <FilterSelect
        id="filter-criticality"
        label="Criticidad"
        allLabel="Todas las criticidades"
        value={criticality}
        options={CRITICALITY_OPTIONS}
        onChange={(value) => onChange({ status, criticality: value })}
        className="sm:w-48"
      />
      <Button
        variant="ghost"
        onClick={() => onChange({ status: undefined, criticality: undefined })}
        disabled={!hasFilters}
        className="sm:ml-auto"
      >
        <FilterX /> Limpiar filtros
      </Button>
    </div>
  )
}
