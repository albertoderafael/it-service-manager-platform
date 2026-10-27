import { apiClient } from '@/lib/api-client'
import type {
  Demand,
  DemandCreateRequest,
  DemandListParams,
  DemandPage,
  DemandUpdateRequest,
} from '../model/types'
import { toDemandApiQuery } from '../model/list-params'

const BASE_PATH = '/demands'

/** Acceso a los endpoints de DemandController (/api/demands). */
export const demandsApi = {
  list: (params: DemandListParams, signal?: AbortSignal) =>
    apiClient.get<DemandPage>(BASE_PATH, toDemandApiQuery(params), signal),

  getById: (id: number, signal?: AbortSignal) =>
    apiClient.get<Demand>(`${BASE_PATH}/${id}`, undefined, signal),

  create: (request: DemandCreateRequest) => apiClient.post<Demand>(BASE_PATH, request),

  update: (id: number, request: DemandUpdateRequest) =>
    apiClient.put<Demand>(`${BASE_PATH}/${id}`, request),
}
