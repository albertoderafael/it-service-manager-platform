import { useMemo } from 'react'

import { APPLICATION_OPTIONS_LIMIT, useApplicationOptions } from '@/features/applications/api/applications-queries'

export interface ApplicationOption {
  value: string
  name: string
  inactive: boolean
}

/**
 * Aplicaciones reales (GET /api/applications) preparadas para los desplegables
 * de demandas. Se ofrecen todas, activas e inactivas; las inactivas se marcan.
 * `ensure` añade una aplicación que no venga en la lista (p. ej. la asociada a
 * la demanda si el catálogo supera el límite de carga).
 */
export function useApplicationSelectOptions(ensure?: { id: number; name: string }) {
  const query = useApplicationOptions()
  const ensureId = ensure?.id
  const ensureName = ensure?.name

  const options = useMemo<ApplicationOption[]>(() => {
    const list: ApplicationOption[] = (query.data?.content ?? []).map((app) => ({
      value: String(app.id),
      name: app.name,
      inactive: app.status === 'INACTIVE',
    }))
    if (ensureId !== undefined && ensureName && !list.some((o) => o.value === String(ensureId))) {
      list.unshift({ value: String(ensureId), name: ensureName, inactive: false })
    }
    return list
  }, [query.data, ensureId, ensureName])

  const truncated = (query.data?.totalElements ?? 0) > APPLICATION_OPTIONS_LIMIT

  return { query, options, truncated }
}
