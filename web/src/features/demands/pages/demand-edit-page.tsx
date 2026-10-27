import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Eye, Loader2, Lock, RefreshCw, RotateCcw, Save } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/common/page-header'
import { ResourceNotFound } from '@/components/common/resource-not-found'
import { ErrorState, LoadingState } from '@/components/common/state-views'
import { getErrorMessage, isApiError } from '@/lib/api-client'
import { applyServerFieldErrors } from '@/lib/form-errors'
import { parseEntityId } from '@/lib/route-params'
import { useDemand, useUpdateDemand } from '../api/demands-queries'
import {
  ApplicationField,
  DemandStatusField,
  DescriptionField,
  PriorityField,
  RequiredFieldsNote,
  TitleField,
} from '../components/demand-form-fields'
import { DemandSummary } from '../components/demand-summary'
import { StatusFlow } from '../components/status-flow'
import { DEMAND_STATUS_LABELS, UNAVAILABLE_APPLICATION_LABEL } from '../model/constants'
import {
  createDemandUpdateSchema,
  normalizeDescription,
  type DemandUpdateFormInput,
  type DemandUpdateFormValues,
} from '../model/schemas'
import { parseTransitionError } from '../model/status-rules'
import type { Demand } from '../model/types'

function toFormValues(demand: Demand): DemandUpdateFormInput {
  return {
    title: demand.title,
    description: demand.description ?? '',
    priority: demand.priority,
    status: demand.status,
    applicationId: String(demand.applicationId),
  }
}

export function DemandEditPage() {
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
        eyebrow="Demandas · Modificar"
        title={query.data ? `Modificar «${query.data.title}»` : `Modificar demanda #${id}`}
        description="Actualiza los datos de la demanda. El identificador no es modificable."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/demandas">
                <ArrowLeft /> Volver al listado
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/demandas/${id}`}>
                <Eye /> Ver detalle
              </Link>
            </Button>
          </>
        }
      />

      {query.isPending ? (
        <Card className="max-w-3xl">
          <LoadingState title="Recuperando datos actuales…" />
        </Card>
      ) : query.isError ? (
        isApiError(query.error) && query.error.kind === 'not-found' ? (
          <ResourceNotFound message={notFoundMessage} backTo="/demandas" />
        ) : (
          <Card className="max-w-3xl">
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          </Card>
        )
      ) : (
        // key: se reinicia el formulario si se cambia de demanda.
        <DemandEditForm
          key={query.data.id}
          demand={query.data}
          onReload={async () => (await query.refetch()).data}
        />
      )}
    </>
  )
}

/** Traduce un 409 de transición a un mensaje comprensible. */
function describeConflict(error: unknown): string {
  const message = getErrorMessage(error)
  const transition = parseTransitionError(message)
  if (!transition) return message
  return `El servidor no permite pasar de «${DEMAND_STATUS_LABELS[transition.from]}» a «${DEMAND_STATUS_LABELS[transition.to]}».`
}

function DemandEditForm({
  demand,
  onReload,
}: {
  /** Datos actuales según el servidor. */
  demand: Demand
  onReload: () => Promise<Demand | undefined>
}) {
  const mutation = useUpdateDemand(demand.id)
  const [updated, setUpdated] = useState<Demand | null>(null)
  const [reloading, setReloading] = useState(false)

  // Las transiciones válidas dependen del estado que tiene la demanda en el
  // servidor, que cambia tras guardar o recargar. React Hook Form toma el
  // resolver actualizado en cada render.
  const currentStatus = demand.status
  const resolver = useMemo(() => zodResolver(createDemandUpdateSchema(currentStatus)), [currentStatus])

  const form = useForm<DemandUpdateFormInput, unknown, DemandUpdateFormValues>({
    resolver,
    defaultValues: toFormValues(demand),
    mode: 'onSubmit',
  })
  const { isDirty } = form.formState
  const showUpdated = !isDirty
  const isConflict = isApiError(mutation.error) && mutation.error.status === 409

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await mutation.mutateAsync({
        title: values.title,
        description: normalizeDescription(values.description),
        priority: values.priority,
        status: values.status,
        applicationId: values.applicationId,
      })
      form.reset(toFormValues(result))
      setUpdated(result)
      toast.success('Cambios guardados', { description: `La demanda #${result.id} se ha actualizado.` })
    } catch (error) {
      applyServerFieldErrors(error, form.setError, [
        'title',
        'description',
        'priority',
        'status',
        'applicationId',
      ])
    }
  })

  const reload = async () => {
    setReloading(true)
    try {
      const fresh = await onReload()
      if (fresh) {
        form.reset(toFormValues(fresh))
        mutation.reset()
        setUpdated(null)
      }
    } finally {
      setReloading(false)
    }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,48rem)_1fr]">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Datos de la demanda</CardTitle>
          <CardDescription>
            <RequiredFieldsNote />
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="contents">
            <CardContent className="grid gap-6">
              {mutation.isError &&
                (isConflict ? (
                  <Alert variant="destructive">
                    <AlertTitle>Cambio rechazado por el servidor</AlertTitle>
                    <AlertDescription>
                      <p>{describeConflict(mutation.error)}</p>
                      <p>Puede que la demanda haya cambiado mientras la editabas.</p>
                      <Button type="button" variant="outline" size="sm" onClick={reload} disabled={reloading}>
                        {reloading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Recargar datos actuales
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTitle>No se han podido guardar los cambios</AlertTitle>
                    <AlertDescription>
                      {isApiError(mutation.error) && mutation.error.kind === 'not-found'
                        ? `${getErrorMessage(mutation.error)}. Comprueba la aplicación seleccionada.`
                        : getErrorMessage(mutation.error)}
                    </AlertDescription>
                  </Alert>
                ))}

              <div className="grid gap-2 sm:max-w-40">
                <Label htmlFor="demand-id" className="text-muted-foreground">
                  Identificador <Lock className="size-3" />
                </Label>
                <Input id="demand-id" value={`#${demand.id}`} readOnly disabled className="font-mono" />
              </div>
              <TitleField />
              <div className="grid gap-6 sm:grid-cols-2">
                <ApplicationField current={{ id: demand.applicationId, name: demand.applicationName ?? UNAVAILABLE_APPLICATION_LABEL }} />
                <PriorityField />
              </div>
              <DescriptionField />
              <Separator />
              <div className="grid gap-4 sm:grid-cols-[16rem_1fr] sm:items-start">
                <DemandStatusField currentStatus={demand.status} />
                <div className="space-y-2 sm:pt-6">
                  <StatusFlow current={demand.status} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-wrap justify-between gap-2 border-t">
              <span className="text-xs text-muted-foreground">
                {isDirty ? 'Hay cambios sin guardar.' : 'Sin cambios pendientes.'}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    form.reset()
                    mutation.reset()
                  }}
                  disabled={!isDirty || mutation.isPending}
                >
                  <RotateCcw /> Descartar
                </Button>
                <Button type="submit" disabled={!isDirty || mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                  {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {updated && showUpdated && (
        <Card className="border-emerald-200">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="size-4" /> Datos actualizados
            </CardTitle>
            <CardDescription>Respuesta del servidor tras guardar los cambios.</CardDescription>
          </CardHeader>
          <CardContent>
            <DemandSummary demand={updated} columns={1} />
          </CardContent>
          <CardFooter className="flex-wrap justify-end gap-2 border-t">
            <Button asChild variant="outline" size="sm">
              <Link to="/demandas">
                <ArrowLeft /> Volver al listado
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to={`/demandas/${updated.id}`}>
                <Eye /> Ver detalle
              </Link>
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
