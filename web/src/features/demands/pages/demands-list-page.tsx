import { useCallback, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/common/page-header'
import { PaginationBar } from '@/components/common/pagination-bar'
import { TableSkeleton } from '@/components/common/table-skeleton'
import { EmptyState, ErrorState } from '@/components/common/state-views'
import { getErrorMessage } from '@/lib/api-client'
import { nextSort, PAGE_SIZE_OPTIONS } from '@/lib/list-params'
import { useDemands } from '../api/demands-queries'
import { DemandFilters } from '../components/demand-filters'
import { DemandsTable } from '../components/demands-table'
import { parseDemandListParams, serializeDemandListParams } from '../model/list-params'
import type { DemandListParams, DemandSortField } from '../model/types'

export function DemandsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useMemo(() => parseDemandListParams(searchParams), [searchParams])
  const query = useDemands(params)

  const updateParams = useCallback(
    (patch: Partial<DemandListParams>, options?: { replace?: boolean }) => {
      setSearchParams(serializeDemandListParams({ ...params, ...patch }), options)
    },
    [params, setSearchParams],
  )

  // Si la página solicitada queda fuera de rango, ir a la última.
  const totalPages = query.data?.totalPages
  useEffect(() => {
    if (totalPages !== undefined && totalPages > 0 && params.page > totalPages - 1) {
      updateParams({ page: totalPages - 1 }, { replace: true })
    }
  }, [totalPages, params.page, updateParams])

  const handleSortChange = (field: DemandSortField) => updateParams({ ...nextSort(params, field), page: 0 })

  const hasFilters = params.applicationId !== undefined || !!params.status || !!params.priority
  const clearFilters = () =>
    updateParams({ applicationId: undefined, status: undefined, priority: undefined, page: 0 })
  const data = query.data

  return (
    <>
      <PageHeader
        eyebrow="Demandas"
        title="Consultar demandas"
        description="Peticiones de evolución y mantenimiento asociadas a las aplicaciones."
        actions={
          <Button asChild variant="brand">
            <Link to="/demandas/nueva">
              <Plus /> Nueva demanda
            </Link>
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <DemandFilters
          applicationId={params.applicationId}
          status={params.status}
          priority={params.priority}
          onChange={(filters) => updateParams({ ...filters, page: 0 })}
        />
        <Separator />

        {query.isPending ? (
          <TableSkeleton label="Cargando demandas" rows={Math.min(params.size, 8)} />
        ) : query.isError && !data ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : data && data.content.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'Ninguna demanda coincide con los filtros' : 'Todavía no hay demandas'}
            description={
              hasFilters
                ? 'Prueba a cambiar o limpiar los filtros seleccionados.'
                : 'Registra la primera demanda asociada a una aplicación.'
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button asChild size="sm" variant="brand">
                  <Link to="/demandas/nueva">
                    <Plus /> Nueva demanda
                  </Link>
                </Button>
              )
            }
          />
        ) : data ? (
          <>
            {query.isError && (
              <p className="border-b bg-destructive/5 px-4 py-2 text-sm text-destructive">
                No se ha podido actualizar el listado: {getErrorMessage(query.error)} Se muestran los
                últimos datos obtenidos.
              </p>
            )}
            <DemandsTable
              demands={data.content}
              sortField={params.sortField}
              sortDirection={params.sortDirection}
              onSortChange={handleSortChange}
              isFetching={query.isFetching && query.isPlaceholderData}
            />
            <PaginationBar
              page={data.page}
              size={data.size}
              totalElements={data.totalElements}
              totalPages={data.totalPages}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={(page) => updateParams({ page })}
              onSizeChange={(size) => updateParams({ size, page: 0 })}
              disabled={query.isFetching}
            />
          </>
        ) : null}
      </Card>
    </>
  )
}
