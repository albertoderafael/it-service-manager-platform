import { z } from 'zod'

import { DEMAND_PRIORITIES, DEMAND_STATUSES, type DemandStatus } from './types'
import { DEMAND_STATUS_LABELS, DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from './constants'
import { canTransition } from './status-rules'

/*
 * Esquemas de validación de formularios. Reflejan las restricciones de
 * Bean Validation de DemandCreateRequest y DemandUpdateRequest
 * (@NotBlank, @Size, @Pattern, @NotNull).
 */

const titleField = z
  .string()
  .trim()
  .min(1, 'El título es obligatorio.')
  .max(TITLE_MAX_LENGTH, `El título no puede superar los ${TITLE_MAX_LENGTH} caracteres.`)

const descriptionField = z
  .string()
  .trim()
  .max(
    DESCRIPTION_MAX_LENGTH,
    `La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres.`,
  )

const priorityField = z.enum(DEMAND_PRIORITIES, {
  errorMap: () => ({ message: 'Selecciona una prioridad.' }),
})

const statusField = z.enum(DEMAND_STATUSES, {
  errorMap: () => ({ message: 'Selecciona un estado.' }),
})

/** El desplegable trabaja con texto; se envía al backend como número. */
const applicationIdField = z
  .string({ required_error: 'Selecciona una aplicación.', invalid_type_error: 'Selecciona una aplicación.' })
  .regex(/^\d+$/, 'Selecciona una aplicación.')
  .transform(Number)

export const demandCreateSchema = z.object({
  title: titleField,
  description: descriptionField,
  priority: priorityField,
  applicationId: applicationIdField,
})

/**
 * El esquema de modificación depende del estado actual de la demanda:
 * solo admite el mismo estado o una transición válida.
 */
export function createDemandUpdateSchema(currentStatus: DemandStatus) {
  return demandCreateSchema.extend({ status: statusField }).superRefine((values, ctx) => {
    if (!canTransition(currentStatus, values.status)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['status'],
        message: `No se puede pasar de «${DEMAND_STATUS_LABELS[currentStatus]}» a «${DEMAND_STATUS_LABELS[values.status]}».`,
      })
    }
  })
}

export type DemandCreateFormInput = z.input<typeof demandCreateSchema>
export type DemandCreateFormValues = z.output<typeof demandCreateSchema>
export type DemandUpdateFormInput = z.input<ReturnType<typeof createDemandUpdateSchema>>
export type DemandUpdateFormValues = z.output<ReturnType<typeof createDemandUpdateSchema>>

/** Una descripción vacía se envía como null para no almacenar cadenas vacías. */
export function normalizeDescription(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
