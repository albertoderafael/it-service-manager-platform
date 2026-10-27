import type { SortDirection } from '@/lib/list-params'

/**
 * Tipos del dominio "Demandas", alineados con los DTO del backend
 * (paquete com.albertoderafael.itmanager.demand.dto).
 */

export const DEMAND_STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const
export type DemandStatus = (typeof DEMAND_STATUSES)[number]

export const DEMAND_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export type DemandPriority = (typeof DEMAND_PRIORITIES)[number]

/** DemandResponse. Las fechas son java.time.Instant serializados en ISO-8601 (UTC). */
export interface Demand {
  id: number
  title: string
  description: string | null
  priority: DemandPriority
  status: DemandStatus
  applicationId: number
  /** null si la aplicación ya no existe en el catálogo (el servicio de demandas no falla por ello). */
  applicationName: string | null
  createdAt: string
  updatedAt: string
}

/** DemandCreateRequest. El estado inicial (OPEN) lo asigna el backend. */
export interface DemandCreateRequest {
  title: string
  description: string | null
  priority: DemandPriority
  applicationId: number
}

/** DemandUpdateRequest */
export interface DemandUpdateRequest {
  title: string
  description: string | null
  priority: DemandPriority
  status: DemandStatus
  applicationId: number
}

/** DemandPageResponse (paginación 0-based de Spring Data). */
export interface DemandPage {
  content: Demand[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/**
 * Campos por los que se permite ordenar (propiedades de la entidad Demand).
 * "application.name" ordena por el nombre de la aplicación asociada.
 */
export const DEMAND_SORT_FIELDS = [
  'id',
  'title',
  'application.name',
  'priority',
  'status',
  'createdAt',
  'updatedAt',
] as const
export type DemandSortField = (typeof DEMAND_SORT_FIELDS)[number]

/** Criterios de consulta del listado. */
export interface DemandListParams {
  applicationId?: number
  status?: DemandStatus
  priority?: DemandPriority
  page: number
  size: number
  sortField: DemandSortField
  sortDirection: SortDirection
}
