import type { DemandListParams, DemandPriority, DemandStatus } from './types'

export const DEMAND_STATUS_LABELS: Record<DemandStatus, string> = {
  OPEN: 'Abierta',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
}

export const DEMAND_PRIORITY_LABELS: Record<DemandPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

/** Por defecto, las demandas más recientes primero. */
export const DEFAULT_DEMAND_LIST_PARAMS: DemandListParams = {
  page: 0,
  size: 10,
  sortField: 'id',
  sortDirection: 'desc',
}

export const TITLE_MAX_LENGTH = 150
export const DESCRIPTION_MAX_LENGTH = 1000

/** Texto para una demanda cuya aplicación ya no existe en el catálogo. */
export const UNAVAILABLE_APPLICATION_LABEL = 'Aplicación no disponible'
