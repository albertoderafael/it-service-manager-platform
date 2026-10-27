import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Hash, Loader2, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/common/page-header'
import { PaginationBar } from '@/components/common/pagination-bar'
import { TableSkeleton } from '@/components/common/table-skeleton'
import { nextSort, PAGE_SIZE_OPTIONS } from '@/lib/list-params'
import { parseEntityId } from '@/lib/route-params'
import { EmptyState, ErrorState } from '@/components/common/state-views'
import { getErrorMessage, isApiError } from '@/lib/api-client'
import { useApplication, useApplications } from '../api/applications-queries'
import { ApplicationFilters } from '../components/application-filters'
import { CriticalityBadge, StatusBadge } from '../components/application-badges'
import { ApplicationsTable } from '../components/applications-table'
import { DEFAULT_LIST_PARAMS } from '../model/constants'
import type { ApplicationListParams, ApplicationSortField } from '../model/types'

/**
 * Punto de entrada de «Modificar aplicación» desde el menú: permite localizar
 * la aplicación por identificador o seleccionarla en el catálogo.
 */
export function ApplicationEditSelectorPage() {
  return (
    <>
      <PageHeader
        eyebrow="Aplicaciones"
        title="Modificar aplicación"
        description="Localiza la aplicación que quieres modificar por su identificador o selecciónala en el catálogo."
      />
      <div className="grid gap-6">
        <FindById />
        <PickFromCatalog />
      </div>
    </>
  )
}

function FindById() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [searchedId, setSearchedId] = useState<number | undefined>()
  const [invalid, setInvalid] = useState(false)
  const query = useApplication(searchedId)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const id = parseEntityId(value.trim())
    setInvalid(id === undefined)
    setSearchedId(id)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="size-4 text-brand-strong" /> Buscar por identificador
        </CardTitle>
        <CardDescription>Consulta la aplicación en el servidor antes de editarla.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="search-id">Identificador</Label>
            <Input
              id="search-id"
              inputMode="numeric"
              placeholder="Ej.: 1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="sm:w-40"
              aria-invalid={invalid}
            />
          </div>
          <Button type="submit" variant="outline" disabled={!value.trim() || query.isFetching}>
            {query.isFetching ? <Loader2 className="animate-spin" /> : <Search />} Buscar
          </Button>
        </form>

        {invalid && (
          <p className="text-sm text-destructive">Introduce un identificador numérico válido (mayor que 0).</p>
        )}

        {searchedId !== undefined && query.isError && (
          <p className="text-sm text-destructive" role="alert">
            {isApiError(query.error) && query.error.kind === 'not-found'
              ? `No existe ninguna aplicación con el identificador #${searchedId}.`
              : getErrorMessage(query.error)}
          </p>
        )}

        {query.data && (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="font-medium">
                <span className="mr-2 font-mono text-xs text-muted-foreground">#{query.data.id}</span>
                {query.data.name}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <CriticalityBadge criticality={query.data.criticality} />
                <StatusBadge status={query.data.status} />
              </div>
            </div>
            <Button onClick={() => navigate(`/aplicaciones/${query.data.id}/editar`)}>
              Modificar <ArrowRight />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PickFromCatalog() {
  const navigate = useNavigate()
  const [params, setParams] = useState<ApplicationListParams>({ ...DEFAULT_LIST_PARAMS, size: 5 })
  const query = useApplications(params)
  const data = query.data

  const handleSortChange = (field: ApplicationSortField) =>
    setParams((prev) => ({ ...prev, ...nextSort(prev, field), page: 0 }))

  return (
    <Card className="gap-0 overflow-hidden pb-0">
      <CardHeader className="pb-2">
        <CardTitle>Seleccionar del catálogo</CardTitle>
        <CardDescription>Filtra el catálogo y pulsa «Seleccionar» en la aplicación deseada.</CardDescription>
      </CardHeader>
      <ApplicationFilters
        status={params.status}
        criticality={params.criticality}
        onChange={(filters) => setParams((prev) => ({ ...prev, ...filters, page: 0 }))}
      />
      <Separator />
      {query.isPending ? (
        <TableSkeleton label="Cargando aplicaciones" rows={5} />
      ) : query.isError && !data ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : data && data.content.length === 0 ? (
        <EmptyState title="Ninguna aplicación coincide con los filtros" />
      ) : data ? (
        <>
          <ApplicationsTable
            applications={data.content}
            sortField={params.sortField}
            sortDirection={params.sortDirection}
            onSortChange={handleSortChange}
            mode="select"
            onSelect={(app) => navigate(`/aplicaciones/${app.id}/editar`)}
            isFetching={query.isFetching && query.isPlaceholderData}
          />
          <PaginationBar
            page={data.page}
            size={data.size}
            totalElements={data.totalElements}
            totalPages={data.totalPages}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
            onSizeChange={(size) => setParams((prev) => ({ ...prev, size, page: 0 }))}
            disabled={query.isFetching}
          />
        </>
      ) : null}
    </Card>
  )
}
