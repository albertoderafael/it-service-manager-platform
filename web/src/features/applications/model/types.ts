import type { SortDirection } from '@/lib/list-params'

/**
 * Tipos del dominio "Aplicaciones", alineados con los DTO del backend
 * (paquete com.albertoderafael.itmanager.application.dto).
 */

export const APPLICATION_STATUSES = ['ACTIVE', 'INACTIVE'] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const APPLICATION_CRITICALITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export type ApplicationCriticality = (typeof APPLICATION_CRITICALITIES)[number]

/** ApplicationResponse */
export interface Application {
  id: number
  name: string
  description: string | null
  criticality: ApplicationCriticality
  status: ApplicationStatus
}

/** ApplicationCreateRequest */
export interface ApplicationCreateRequest {
  name: string
  description: string | null
  criticality: ApplicationCriticality
}

/** ApplicationUpdateRequest */
export interface ApplicationUpdateRequest {
  name: string
  description: string | null
  criticality: ApplicationCriticality
  status: ApplicationStatus
}

/** ApplicationPageResponse (paginación 0-based de Spring Data). */
export interface ApplicationPage {
  content: Application[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** Campos por los que se permite ordenar (propiedades de la entidad Application). */
export const APPLICATION_SORT_FIELDS = ['id', 'name', 'criticality', 'status'] as const
export type ApplicationSortField = (typeof APPLICATION_SORT_FIELDS)[number]

/** Criterios de consulta del listado. */
export interface ApplicationListParams {
  status?: ApplicationStatus
  criticality?: ApplicationCriticality
  page: number
  size: number
  sortField: ApplicationSortField
  sortDirection: SortDirection
}
