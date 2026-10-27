import {
  parseEnumParam,
  parseIdParam,
  parsePageParam,
  parseSizeParam,
  parseSortParam,
  writePaginationParams,
} from '@/lib/list-params'
import {
  DEMAND_PRIORITIES,
  DEMAND_SORT_FIELDS,
  DEMAND_STATUSES,
  type DemandListParams,
} from './types'
import { DEFAULT_DEMAND_LIST_PARAMS } from './constants'

/*
 * Estado del listado de demandas en la URL:
 * aplicacion, estado, prioridad, pagina (1-based), tamano, orden (campo,dir).
 */

export function parseDemandListParams(search: URLSearchParams): DemandListParams {
  const sort = parseSortParam(search.get('orden'), DEMAND_SORT_FIELDS, {
    field: DEFAULT_DEMAND_LIST_PARAMS.sortField,
    direction: DEFAULT_DEMAND_LIST_PARAMS.sortDirection,
  })
  return {
    applicationId: parseIdParam(search.get('aplicacion')),
    status: parseEnumParam(DEMAND_STATUSES, search.get('estado')),
    priority: parseEnumParam(DEMAND_PRIORITIES, search.get('prioridad')),
    page: parsePageParam(search.get('pagina'), DEFAULT_DEMAND_LIST_PARAMS.page),
    size: parseSizeParam(search.get('tamano'), DEFAULT_DEMAND_LIST_PARAMS.size),
    sortField: sort.field,
    sortDirection: sort.direction,
  }
}

export function serializeDemandListParams(params: DemandListParams): URLSearchParams {
  const search = new URLSearchParams()
  if (params.applicationId !== undefined) search.set('aplicacion', String(params.applicationId))
  if (params.status) search.set('estado', params.status)
  if (params.priority) search.set('prioridad', params.priority)
  writePaginationParams(search, params, DEFAULT_DEMAND_LIST_PARAMS)
  return search
}

/** Parámetros de GET /api/demands (Spring Data Pageable). */
export function toDemandApiQuery(params: DemandListParams) {
  return {
    applicationId: params.applicationId,
    status: params.status,
    priority: params.priority,
    page: params.page,
    size: params.size,
    sort: `${params.sortField},${params.sortDirection}`,
  }
}
