import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Eye, Loader2, Lock, RotateCcw, Save } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/common/page-header'
import { ResourceNotFound } from '@/components/common/resource-not-found'
import { parseEntityId } from '@/lib/route-params'
import { applyServerFieldErrors } from '@/lib/form-errors'
import { ErrorState, LoadingState } from '@/components/common/state-views'
import { getErrorMessage, isApiError } from '@/lib/api-client'
import { useApplication, useUpdateApplication } from '../api/applications-queries'
import {
  CriticalityField,
  DescriptionField,
  NameField,
  RequiredFieldsNote,
  StatusField,
} from '../components/application-form-fields'
import { ApplicationSummary } from '../components/application-summary'
import {
  applicationUpdateSchema,
  normalizeDescription,
  type ApplicationUpdateFormInput,
  type ApplicationUpdateFormValues,
} from '../model/schemas'
import type { Application } from '../model/types'

function toFormValues(app: Application): ApplicationUpdateFormInput {
  return {
    name: app.name,
    description: app.description ?? '',
    criticality: app.criticality,
    status: app.status,
  }
}

export function ApplicationEditPage() {
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
        eyebrow="Aplicaciones · Modificar"
        title={query.data ? `Modificar «${query.data.name}»` : `Modificar aplicación #${id}`}
        description="Actualiza los datos de la aplicación. El identificador no es modificable."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/aplicaciones">
                <ArrowLeft /> Volver al listado
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/aplicaciones/${id}`}>
                <Eye /> Ver detalle
              </Link>
            </Button>
          </>
        }
      />

      {query.isPending ? (
        <Card className="max-w-3xl"><LoadingState title="Recuperando datos actuales…" /></Card>
      ) : query.isError ? (
        isApiError(query.error) && query.error.kind === 'not-found' ? (
          <ResourceNotFound
            message={`No existe ninguna aplicación con el identificador «${rawId}»`}
            backTo="/aplicaciones"
          />
        ) : (
          <Card className="max-w-3xl"><ErrorState error={query.error} onRetry={() => query.refetch()} /></Card>
        )
      ) : (
        // key: se reinicia el formulario si se cambia de aplicación.
        <ApplicationEditForm key={query.data.id} application={query.data} />
      )}
    </>
  )
}

function ApplicationEditForm({ application }: { application: Application }) {
  const mutation = useUpdateApplication(application.id)
  const [updated, setUpdated] = useState<Application | null>(null)

  const form = useForm<ApplicationUpdateFormInput, unknown, ApplicationUpdateFormValues>({
    resolver: zodResolver(applicationUpdateSchema),
    defaultValues: toFormValues(application),
    mode: 'onSubmit',
  })
  const { isDirty } = form.formState

  // Al empezar a editar de nuevo, se oculta la confirmación anterior.
  const showUpdated = !isDirty

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await mutation.mutateAsync({
        name: values.name,
        description: normalizeDescription(values.description),
        criticality: values.criticality,
        status: values.status,
      })
      form.reset(toFormValues(result))
      setUpdated(result)
      toast.success('Cambios guardados', { description: `«${result.name}» se ha actualizado.` })
    } catch (error) {
      applyServerFieldErrors(error, form.setError, ['name', 'description', 'criticality', 'status'])
    }
  })

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,48rem)_1fr]">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Datos de la aplicación</CardTitle>
          <CardDescription>
            <RequiredFieldsNote />
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="contents">
            <CardContent className="grid gap-6">
              {mutation.isError && (
                <Alert variant="destructive">
                  <AlertTitle>No se han podido guardar los cambios</AlertTitle>
                  <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2 sm:max-w-40">
                <Label htmlFor="application-id" className="text-muted-foreground">
                  Identificador <Lock className="size-3" />
                </Label>
                <Input id="application-id" value={`#${application.id}`} readOnly disabled className="font-mono" />
              </div>
              <div className="grid gap-6 sm:grid-cols-[1fr_16rem]">
                <NameField />
                <CriticalityField />
              </div>
              <DescriptionField />
              <div className="sm:max-w-64">
                <StatusField />
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
            <ApplicationSummary application={updated} columns={1} />
          </CardContent>
          <CardFooter className="flex-wrap justify-end gap-2 border-t">
            <Button asChild variant="outline" size="sm">
              <Link to="/aplicaciones">
                <ArrowLeft /> Volver al listado
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to={`/aplicaciones/${updated.id}`}>
                <Eye /> Ver detalle
              </Link>
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
