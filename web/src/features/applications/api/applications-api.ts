import { apiClient } from '@/lib/api-client'
import type {
  Application,
  ApplicationCreateRequest,
  ApplicationListParams,
  ApplicationPage,
  ApplicationUpdateRequest,
} from '../model/types'
import { toApiQuery } from '../model/list-params'

const BASE_PATH = '/applications'

/** Acceso a los endpoints de ApplicationController (/api/applications). */
export const applicationsApi = {
  list: (params: ApplicationListParams, signal?: AbortSignal) =>
    apiClient.get<ApplicationPage>(BASE_PATH, toApiQuery(params), signal),

  getById: (id: number, signal?: AbortSignal) =>
    apiClient.get<Application>(`${BASE_PATH}/${id}`, undefined, signal),

  create: (request: ApplicationCreateRequest) =>
    apiClient.post<Application>(BASE_PATH, request),

  update: (id: number, request: ApplicationUpdateRequest) =>
    apiClient.put<Application>(`${BASE_PATH}/${id}`, request),
}
