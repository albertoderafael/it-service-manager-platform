/*
 * Utilidades compartidas para listados paginados cuyo estado vive en la URL
 * (filtros, página, tamaño y orden) y se traduce a parámetros de Spring Data.
 */

import { parseEntityId } from './route-params'

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const

export type SortDirection = 'asc' | 'desc'

/** Nombres de los parámetros de paginación en la URL (comunes a todos los listados). */
export const PAGINATION_URL_KEYS = { page: 'pagina', size: 'tamano', sort: 'orden' } as const

/** Devuelve el valor si pertenece a la lista; si no, undefined. */
export function parseEnumParam<T extends string>(
  allowed: readonly T[],
  value: string | null,
): T | undefined {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : undefined
}

/** Identificador positivo opcional (p. ej. ?aplicacion=3). */
export function parseIdParam(value: string | null): number | undefined {
  return parseEntityId(value)
}

/** Página 1-based en la URL → 0-based (Spring Data). */
export function parsePageParam(value: string | null, fallback = 0): number {
  const page = Number.parseInt(value ?? '', 10)
  return Number.isFinite(page) && page >= 1 ? page - 1 : fallback
}

export function parseSizeParam(value: string | null, fallback: number): number {
  const size = Number.parseInt(value ?? '', 10)
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(size) ? size : fallback
}

/** "campo,dir" → { field, direction } validando ambos. */
export function parseSortParam<F extends string>(
  value: string | null,
  allowedFields: readonly F[],
  fallback: { field: F; direction: SortDirection },
): { field: F; direction: SortDirection } {
  const [field, direction] = (value ?? '').split(',')
  return {
    field: parseEnumParam(allowedFields, field ?? null) ?? fallback.field,
    direction: direction === 'asc' || direction === 'desc' ? direction : fallback.direction,
  }
}

/** Escribe paginación y orden en la URL omitiendo los valores por defecto. */
export function writePaginationParams(
  search: URLSearchParams,
  current: { page: number; size: number; sortField: string; sortDirection: SortDirection },
  defaults: { size: number; sortField: string; sortDirection: SortDirection },
): void {
  if (current.page > 0) search.set(PAGINATION_URL_KEYS.page, String(current.page + 1))
  if (current.size !== defaults.size) search.set(PAGINATION_URL_KEYS.size, String(current.size))
  if (current.sortField !== defaults.sortField || current.sortDirection !== defaults.sortDirection) {
    search.set(PAGINATION_URL_KEYS.sort, `${current.sortField},${current.sortDirection}`)
  }
}

/** Siguiente orden al pulsar una cabecera: mismo campo alterna; campo nuevo empieza ascendente. */
export function nextSort<F extends string>(
  current: { sortField: F; sortDirection: SortDirection },
  field: F,
): { sortField: F; sortDirection: SortDirection } {
  return {
    sortField: field,
    sortDirection: current.sortField === field && current.sortDirection === 'asc' ? 'desc' : 'asc',
  }
}
