import { useCallback, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/common/page-header'
import { PaginationBar } from '@/components/common/pagination-bar'
import { TableSkeleton } from '@/components/common/table-skeleton'
import { getErrorMessage } from '@/lib/api-client'
import { nextSort, PAGE_SIZE_OPTIONS } from '@/lib/list-params'
import { EmptyState, ErrorState } from '@/components/common/state-views'
import { useApplications } from '../api/applications-queries'
import { ApplicationFilters } from '../components/application-filters'
import { ApplicationsTable } from '../components/applications-table'
import { parseListParams, serializeListParams } from '../model/list-params'
import type { ApplicationListParams, ApplicationSortField } from '../model/types'

export function ApplicationsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useMemo(() => parseListParams(searchParams), [searchParams])
  const query = useApplications(params)

  const updateParams = useCallback(
    (patch: Partial<ApplicationListParams>, options?: { replace?: boolean }) => {
      setSearchParams(serializeListParams({ ...params, ...patch }), options)
    },
    [params, setSearchParams],
  )

  // Si la página solicitada queda fuera de rango (p. ej. tras cambiar datos), ir a la última.
  const totalPages = query.data?.totalPages
  useEffect(() => {
    if (totalPages !== undefined && totalPages > 0 && params.page > totalPages - 1) {
      updateParams({ page: totalPages - 1 }, { replace: true })
    }
  }, [totalPages, params.page, updateParams])

  const handleSortChange = (field: ApplicationSortField) =>
    updateParams({ ...nextSort(params, field), page: 0 })

  const hasFilters = !!params.status || !!params.criticality
  const data = query.data

  return (
    <>
      <PageHeader
        eyebrow="Aplicaciones"
        title="Consultar aplicaciones"
        description="Catálogo de aplicaciones gestionadas, con su criticidad y estado."
        actions={
          <Button asChild variant="brand">
            <Link to="/aplicaciones/nueva">
              <Plus /> Nueva aplicación
            </Link>
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <ApplicationFilters
          status={params.status}
          criticality={params.criticality}
          onChange={(filters) => updateParams({ ...filters, page: 0 })}
        />
        <Separator />

        {query.isPending ? (
          <TableSkeleton label="Cargando aplicaciones" rows={Math.min(params.size, 8)} />
        ) : query.isError && !data ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : data && data.content.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'Ninguna aplicación coincide con los filtros' : 'Todavía no hay aplicaciones'}
            description={
              hasFilters
                ? 'Prueba a cambiar o limpiar los filtros seleccionados.'
                : 'Da de alta la primera aplicación para empezar a gestionarla.'
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={() => updateParams({ status: undefined, criticality: undefined, page: 0 })}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button asChild size="sm" variant="brand">
                  <Link to="/aplicaciones/nueva">
                    <Plus /> Nueva aplicación
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
            <ApplicationsTable
              applications={data.content}
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
