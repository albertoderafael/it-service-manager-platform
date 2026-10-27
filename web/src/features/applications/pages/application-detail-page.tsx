import { Link, useParams } from 'react-router'
import { ArrowLeft, ClipboardList, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PageHeader } from '@/components/common/page-header'
import { ResourceNotFound } from '@/components/common/resource-not-found'
import { parseEntityId } from '@/lib/route-params'
import { ErrorState, LoadingState } from '@/components/common/state-views'
import { isApiError } from '@/lib/api-client'
import { useApplication } from '../api/applications-queries'
import { ApplicationSummary } from '../components/application-summary'

export function ApplicationDetailPage() {
  const { id: rawId } = useParams()
  const id = parseEntityId(rawId)
  const query = useApplication(id)

  if (id === undefined) return (
      <ResourceNotFound
        message={`No existe ninguna aplicación con el identificador «${rawId}»`}
        backTo="/aplicaciones"
        page={{ eyebrow: 'Aplicaciones', title: 'Aplicación no encontrada' }}
      />
    )

  return (
    <>
      <PageHeader
        eyebrow="Aplicaciones · Detalle"
        title={query.data ? query.data.name : `Aplicación #${id}`}
        description="Datos actuales de la aplicación obtenidos del servidor."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/aplicaciones">
                <ArrowLeft /> Volver al listado
              </Link>
            </Button>
            {query.data && (
              <Button asChild variant="outline">
                <Link to={`/demandas?aplicacion=${id}`}>
                  <ClipboardList /> Ver demandas
                </Link>
              </Button>
            )}
            {query.data && (
              <Button asChild>
                <Link to={`/aplicaciones/${id}/editar`}>
                  <Pencil /> Modificar
                </Link>
              </Button>
            )}
          </>
        }
      />

      {query.isPending ? (
        <Card><LoadingState title="Cargando aplicación…" /></Card>
      ) : query.isError ? (
        isApiError(query.error) && query.error.kind === 'not-found' ? (
          <ResourceNotFound
            message={`No existe ninguna aplicación con el identificador «${rawId}»`}
            backTo="/aplicaciones"
          />
        ) : (
          <Card><ErrorState error={query.error} onRetry={() => query.refetch()} /></Card>
        )
      ) : (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Ficha de la aplicación</CardTitle>
            <CardDescription>Identificador #{query.data.id}</CardDescription>
          </CardHeader>
          <CardContent>
            <ApplicationSummary application={query.data} />
          </CardContent>
        </Card>
      )}
    </>
  )
}
