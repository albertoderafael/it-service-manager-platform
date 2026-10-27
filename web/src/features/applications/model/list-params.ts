import {
  parseEnumParam,
  parsePageParam,
  parseSizeParam,
  parseSortParam,
  writePaginationParams,
} from '@/lib/list-params'
import {
  APPLICATION_CRITICALITIES,
  APPLICATION_SORT_FIELDS,
  APPLICATION_STATUSES,
  type ApplicationListParams,
} from './types'
import { DEFAULT_LIST_PARAMS } from './constants'

/*
 * El estado del listado (filtros, página, tamaño y orden) vive en la URL.
 * Así el listado se puede recargar, compartir y navegar con "atrás"/"adelante".
 *
 * Parámetros de URL: estado, criticidad, pagina (1-based), tamano, orden (campo,dir).
 */

export function parseListParams(search: URLSearchParams): ApplicationListParams {
  const sort = parseSortParam(search.get('orden'), APPLICATION_SORT_FIELDS, {
    field: DEFAULT_LIST_PARAMS.sortField,
    direction: DEFAULT_LIST_PARAMS.sortDirection,
  })
  return {
    status: parseEnumParam(APPLICATION_STATUSES, search.get('estado')),
    criticality: parseEnumParam(APPLICATION_CRITICALITIES, search.get('criticidad')),
    page: parsePageParam(search.get('pagina'), DEFAULT_LIST_PARAMS.page),
    size: parseSizeParam(search.get('tamano'), DEFAULT_LIST_PARAMS.size),
    sortField: sort.field,
    sortDirection: sort.direction,
  }
}

/** Serializa a URL omitiendo los valores por defecto para mantenerla limpia. */
export function serializeListParams(params: ApplicationListParams): URLSearchParams {
  const search = new URLSearchParams()
  if (params.status) search.set('estado', params.status)
  if (params.criticality) search.set('criticidad', params.criticality)
  writePaginationParams(search, params, DEFAULT_LIST_PARAMS)
  return search
}

/** Parámetros de consulta que espera el backend (Spring Data Pageable). */
export function toApiQuery(params: ApplicationListParams) {
  return {
    status: params.status,
    criticality: params.criticality,
    page: params.page,
    size: params.size,
    sort: `${params.sortField},${params.sortDirection}`,
  }
}
