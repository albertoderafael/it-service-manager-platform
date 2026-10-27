import { Link, useParams } from 'react-router'
import { ArrowLeft, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/common/page-header'
import { ResourceNotFound } from '@/components/common/resource-not-found'
import { ErrorState, LoadingState } from '@/components/common/state-views'
import { isApiError } from '@/lib/api-client'
import { parseEntityId } from '@/lib/route-params'
import { useDemand } from '../api/demands-queries'
import { DemandSummary } from '../components/demand-summary'
import { StatusFlow } from '../components/status-flow'

export function DemandDetailPage() {
  const { id: rawId } = useParams()
  const id = parseEntityId(rawId)
  const query = useDemand(id)
  const notFoundMessage = `No existe ninguna demanda con el identificador «${rawId}»`

  if (id === undefined) {
    return (
      <ResourceNotFound
        message={notFoundMessage}
        backTo="/demandas"
        page={{ eyebrow: 'Demandas', title: 'Demanda no encontrada' }}
      />
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Demandas · Detalle"
        title={query.data ? query.data.title : `Demanda #${id}`}
        description="Datos actuales de la demanda obtenidos del servidor."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/demandas">
                <ArrowLeft /> Volver al listado
              </Link>
            </Button>
            {query.data && (
              <Button asChild>
                <Link to={`/demandas/${id}/editar`}>
                  <Pencil /> Modificar
                </Link>
              </Button>
            )}
          </>
        }
      />

      {query.isPending ? (
        <Card>
          <LoadingState title="Cargando demanda…" />
        </Card>
      ) : query.isError ? (
        isApiError(query.error) && query.error.kind === 'not-found' ? (
          <ResourceNotFound message={notFoundMessage} backTo="/demandas" />
        ) : (
          <Card>
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          </Card>
        )
      ) : (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Ficha de la demanda</CardTitle>
            <CardDescription>Identificador #{query.data.id}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <DemandSummary demand={query.data} />
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Ciclo de vida
              </p>
              <StatusFlow current={query.data.status} />
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
