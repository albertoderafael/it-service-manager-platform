import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import { isApiError } from '@/lib/api-client'

/**
 * Traslada los errores de validación devueltos por el backend
 * (ApiErrorResponse.fieldErrors) a los campos del formulario.
 * Devuelve true si se ha asignado algún error de campo.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
): boolean {
  if (!isApiError(error) || error.kind !== 'validation') return false
  let applied = false
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if ((knownFields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message })
      applied = true
    }
  }
  return applied
}
