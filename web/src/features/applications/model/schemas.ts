import { z } from 'zod'

import { APPLICATION_CRITICALITIES, APPLICATION_STATUSES } from './types'
import { DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH } from './constants'

/*
 * Esquemas de validación de formularios. Reflejan las restricciones de
 * Bean Validation de los DTO del backend (@NotBlank, @Size, @Pattern), de modo
 * que el usuario recibe los errores antes de enviar la petición.
 */

const nameField = z
  .string()
  .trim()
  .min(1, 'El nombre es obligatorio.')
  .max(NAME_MAX_LENGTH, `El nombre no puede superar los ${NAME_MAX_LENGTH} caracteres.`)

const descriptionField = z
  .string()
  .trim()
  .max(
    DESCRIPTION_MAX_LENGTH,
    `La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres.`,
  )

const criticalityField = z.enum(APPLICATION_CRITICALITIES, {
  errorMap: () => ({ message: 'Selecciona una criticidad.' }),
})

const statusField = z.enum(APPLICATION_STATUSES, {
  errorMap: () => ({ message: 'Selecciona un estado.' }),
})

export const applicationCreateSchema = z.object({
  name: nameField,
  description: descriptionField,
  criticality: criticalityField,
})

export const applicationUpdateSchema = applicationCreateSchema.extend({
  status: statusField,
})

/** Valores del formulario tal y como los maneja React Hook Form (antes de validar). */
export type ApplicationCreateFormInput = z.input<typeof applicationCreateSchema>
export type ApplicationCreateFormValues = z.output<typeof applicationCreateSchema>
export type ApplicationUpdateFormInput = z.input<typeof applicationUpdateSchema>
export type ApplicationUpdateFormValues = z.output<typeof applicationUpdateSchema>

/** Una descripción vacía se envía como null para no almacenar cadenas vacías. */
export function normalizeDescription(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
