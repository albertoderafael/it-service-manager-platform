import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { isApiError } from '@/lib/api-client'
import { applicationsApi } from './applications-api'
import type {
  ApplicationCreateRequest,
  ApplicationListParams,
  ApplicationUpdateRequest,
} from '../model/types'

/** Claves de caché jerárquicas para invalidar de forma selectiva. */
export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (params: ApplicationListParams) => [...applicationKeys.lists(), params] as const,
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (id: number) => [...applicationKeys.details(), id] as const,
}

export function useApplications(params: ApplicationListParams) {
  return useQuery({
    queryKey: applicationKeys.list(params),
    queryFn: ({ signal }) => applicationsApi.list(params, signal),
    // Mantiene la página anterior visible mientras se carga la siguiente.
    placeholderData: keepPreviousData,
  })
}

export function useApplication(id: number | undefined) {
  return useQuery({
    queryKey: applicationKeys.detail(id ?? -1),
    queryFn: ({ signal }) => applicationsApi.getById(id!, signal),
    enabled: id !== undefined,
    // Un 404 no se reintenta: la aplicación no existe.
    retry: (failureCount, error) =>
      !(isApiError(error) && error.kind === 'not-found') && failureCount < 2,
  })
}

export function useCreateApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: ApplicationCreateRequest) => applicationsApi.create(request),
    onSuccess: (created) => {
      queryClient.setQueryData(applicationKeys.detail(created.id), created)
      return queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
    },
  })
}

export function useUpdateApplication(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: ApplicationUpdateRequest) => applicationsApi.update(id, request),
    onSuccess: (updated) => {
      queryClient.setQueryData(applicationKeys.detail(updated.id), updated)
      return queryClient.invalidateQueries({ queryKey: applicationKeys.lists() })
    },
  })
}

/**
 * Límite de aplicaciones que se cargan para los desplegables. La API no ofrece
 * un endpoint de "todas", así que se pide una página grande ordenada por nombre
 * (Spring Data limita el tamaño máximo de página a 2000 por defecto).
 */
export const APPLICATION_OPTIONS_LIMIT = 1000

/**
 * Catálogo de aplicaciones para desplegables de otros módulos (p. ej. demandas).
 * Cuelga de `lists()`, así que se refresca al crear o modificar aplicaciones.
 */
export function useApplicationOptions() {
  return useQuery({
    queryKey: [...applicationKeys.lists(), 'options'] as const,
    queryFn: ({ signal }) =>
      applicationsApi.list(
        { page: 0, size: APPLICATION_OPTIONS_LIMIT, sortField: 'name', sortDirection: 'asc' },
        signal,
      ),
    staleTime: 5 * 60_000,
  })
}
