import { SelectField, TextareaField, TextInputField } from '@/components/common/form-fields'
import {
  CRITICALITY_LABELS,
  DESCRIPTION_MAX_LENGTH,
  NAME_MAX_LENGTH,
  STATUS_LABELS,
} from '../model/constants'
import { APPLICATION_CRITICALITIES, APPLICATION_STATUSES } from '../model/types'

/*
 * Campos de los formularios de alta y modificación de aplicaciones,
 * construidos sobre los campos genéricos de components/common/form-fields.
 */

const CRITICALITY_OPTIONS = APPLICATION_CRITICALITIES.map((value) => ({
  value,
  label: CRITICALITY_LABELS[value],
  hint: value,
}))

const STATUS_OPTIONS = APPLICATION_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
  hint: value,
}))

export function NameField() {
  return (
    <TextInputField name="name" label="Nombre" required maxLength={NAME_MAX_LENGTH} placeholder="Ej.: Portal de ejemplo" />
  )
}

export function DescriptionField() {
  return (
    <TextareaField
      name="description"
      label="Descripción"
      description="Opcional."
      maxLength={DESCRIPTION_MAX_LENGTH}
      placeholder="Propósito de la aplicación, ámbito funcional, observaciones…"
    />
  )
}

export function CriticalityField() {
  return (
    <SelectField
      name="criticality"
      label="Criticidad"
      required
      options={CRITICALITY_OPTIONS}
      placeholder="Selecciona la criticidad"
    />
  )
}

export function StatusField() {
  return (
    <SelectField name="status" label="Estado" required options={STATUS_OPTIONS} placeholder="Selecciona el estado" />
  )
}

export { RequiredFieldsNote } from '@/components/common/form-fields'
