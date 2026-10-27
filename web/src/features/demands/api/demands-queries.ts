import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { isApiError } from '@/lib/api-client'
import { demandsApi } from './demands-api'
import type { DemandCreateRequest, DemandListParams, DemandUpdateRequest } from '../model/types'

/** Claves de caché jerárquicas para invalidar de forma selectiva. */
export const demandKeys = {
  all: ['demands'] as const,
  lists: () => [...demandKeys.all, 'list'] as const,
  list: (params: DemandListParams) => [...demandKeys.lists(), params] as const,
  details: () => [...demandKeys.all, 'detail'] as const,
  detail: (id: number) => [...demandKeys.details(), id] as const,
}

export function useDemands(params: DemandListParams) {
  return useQuery({
    queryKey: demandKeys.list(params),
    queryFn: ({ signal }) => demandsApi.list(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useDemand(id: number | undefined) {
  return useQuery({
    queryKey: demandKeys.detail(id ?? -1),
    queryFn: ({ signal }) => demandsApi.getById(id!, signal),
    enabled: id !== undefined,
    retry: (failureCount, error) =>
      !(isApiError(error) && error.kind === 'not-found') && failureCount < 2,
  })
}

export function useCreateDemand() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: DemandCreateRequest) => demandsApi.create(request),
    onSuccess: (created) => {
      queryClient.setQueryData(demandKeys.detail(created.id), created)
      return queryClient.invalidateQueries({ queryKey: demandKeys.lists() })
    },
  })
}

export function useUpdateDemand(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: DemandUpdateRequest) => demandsApi.update(id, request),
    onSuccess: (updated) => {
      queryClient.setQueryData(demandKeys.detail(updated.id), updated)
      return queryClient.invalidateQueries({ queryKey: demandKeys.lists() })
    },
  })
}
