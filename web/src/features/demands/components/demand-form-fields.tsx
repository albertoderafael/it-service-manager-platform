import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SelectField, TextareaField, TextInputField } from '@/components/common/form-fields'
import {
  DEMAND_PRIORITY_LABELS,
  DEMAND_STATUS_LABELS,
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../model/constants'
import { getSelectableStatuses, isFinalStatus } from '../model/status-rules'
import { DEMAND_PRIORITIES, DEMAND_STATUSES, type DemandStatus } from '../model/types'
import { useApplicationSelectOptions } from './application-options'

/*
 * Campos de los formularios de alta y modificación de demandas,
 * construidos sobre los campos genéricos de components/common/form-fields.
 */

const PRIORITY_OPTIONS = DEMAND_PRIORITIES.map((value) => ({
  value,
  label: DEMAND_PRIORITY_LABELS[value],
  hint: value,
}))

export function TitleField() {
  return (
    <TextInputField
      name="title"
      label="Título"
      required
      maxLength={TITLE_MAX_LENGTH}
      placeholder="Ej.: Adaptación a la nueva normativa"
    />
  )
}

export function DescriptionField() {
  return (
    <TextareaField
      name="description"
      label="Descripción"
      description="Opcional."
      maxLength={DESCRIPTION_MAX_LENGTH}
      rows={5}
      placeholder="Necesidad, alcance, criterios de aceptación…"
    />
  )
}

export function PriorityField() {
  return (
    <SelectField
      name="priority"
      label="Prioridad"
      required
      options={PRIORITY_OPTIONS}
      placeholder="Selecciona la prioridad"
    />
  )
}

/**
 * Selector de aplicación con datos reales de GET /api/applications.
 * Muestra todas las aplicaciones; las inactivas aparecen marcadas.
 */
export function ApplicationField({ current }: { current?: { id: number; name: string } }) {
  const { query, options, truncated } = useApplicationSelectOptions(current)

  const selectOptions = options.map((o) => ({
    value: o.value,
    label: o.name,
    hint: o.inactive ? 'inactiva' : undefined,
  }))

  let description: ReactNode = undefined
  if (query.isError) {
    description = (
      <span className="flex flex-wrap items-center gap-2 text-destructive">
        No se han podido cargar las aplicaciones.
        <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}>
          <RefreshCw /> Reintentar
        </Button>
      </span>
    )
  } else if (query.isSuccess && options.length === 0) {
    description = (
      <span>
        No hay aplicaciones registradas.{' '}
        <Link to="/aplicaciones/nueva" className="font-medium text-brand-strong underline-offset-4 hover:underline">
          Crea una aplicación
        </Link>{' '}
        antes de registrar demandas.
      </span>
    )
  } else if (truncated) {
    description = 'Se muestran las primeras 1000 aplicaciones por orden alfabético.'
  }

  return (
    <SelectField
      name="applicationId"
      label="Aplicación"
      required
      options={selectOptions}
      placeholder={query.isPending ? 'Cargando aplicaciones…' : 'Selecciona la aplicación'}
      disabled={query.isPending || (query.isError && options.length === 0)}
      description={description}
    />
  )
}

/**
 * Selector de estado que respeta las transiciones válidas: muestra todos los
 * estados, pero solo habilita el actual y los permitidos desde él.
 */
export function DemandStatusField({ currentStatus }: { currentStatus: DemandStatus }) {
  const selectable = getSelectableStatuses(currentStatus)
  const final = isFinalStatus(currentStatus)

  const options = DEMAND_STATUSES.map((value) => ({
    value,
    label: DEMAND_STATUS_LABELS[value],
    hint: value === currentStatus ? 'actual' : selectable.includes(value) ? undefined : 'no permitido',
    disabled: !selectable.includes(value),
  }))

  return (
    <SelectField
      name="status"
      label="Estado"
      required
      options={options}
      placeholder="Selecciona el estado"
      disabled={final}
      description={final ? 'Estado final: no admite más cambios de estado.' : undefined}
    />
  )
}

export { RequiredFieldsNote } from '@/components/common/form-fields'
