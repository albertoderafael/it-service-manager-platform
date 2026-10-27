import type {
  ApplicationCriticality,
  ApplicationListParams,
  ApplicationStatus,
} from './types'

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
}

export const CRITICALITY_LABELS: Record<ApplicationCriticality, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

/** Valores por defecto: coinciden con @PageableDefault(size = 10, sort = "id", ASC) del backend. */
export const DEFAULT_LIST_PARAMS: ApplicationListParams = {
  page: 0,
  size: 10,
  sortField: 'id',
  sortDirection: 'asc',
}

export const NAME_MAX_LENGTH = 100
export const DESCRIPTION_MAX_LENGTH = 500
