import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Eye, Loader2, Plus, Save } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { PageHeader } from '@/components/common/page-header'
import { applyServerFieldErrors } from '@/lib/form-errors'
import { getErrorMessage, isApiError } from '@/lib/api-client'
import { parseIdParam } from '@/lib/list-params'
import { useCreateDemand } from '../api/demands-queries'
import {
  ApplicationField,
  DescriptionField,
  PriorityField,
  RequiredFieldsNote,
  TitleField,
} from '../components/demand-form-fields'
import { DemandSummary } from '../components/demand-summary'
import {
  demandCreateSchema,
  normalizeDescription,
  type DemandCreateFormInput,
  type DemandCreateFormValues,
} from '../model/schemas'
import type { Demand } from '../model/types'

function emptyForm(applicationId?: number): DemandCreateFormInput {
  return {
    title: '',
    description: '',
    priority: undefined as unknown as DemandCreateFormInput['priority'],
    applicationId: applicationId !== undefined ? String(applicationId) : '',
  }
}

export function DemandCreatePage() {
  // Permite llegar con la aplicación preseleccionada: /demandas/nueva?aplicacion=3
  const [searchParams] = useSearchParams()
  const presetApplicationId = parseIdParam(searchParams.get('aplicacion'))

  const [created, setCreated] = useState<Demand | null>(null)
  const mutation = useCreateDemand()

  const form = useForm<DemandCreateFormInput, unknown, DemandCreateFormValues>({
    resolver: zodResolver(demandCreateSchema),
    defaultValues: emptyForm(presetApplicationId),
    mode: 'onSubmit',
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await mutation.mutateAsync({
        title: values.title,
        description: normalizeDescription(values.description),
        priority: values.priority,
        applicationId: values.applicationId,
      })
      setCreated(result)
      toast.success('Demanda creada', { description: `«${result.title}» con identificador #${result.id}.` })
    } catch (error) {
      applyServerFieldErrors(error, form.setError, ['title', 'description', 'priority', 'applicationId'])
    }
  })

  const startOver = () => {
    form.reset(emptyForm(presetApplicationId))
    mutation.reset()
    setCreated(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Demandas"
        title="Nueva demanda"
        description="El identificador, las fechas y el estado inicial (Abierta) los asigna el servidor."
        actions={
          <Button asChild variant="outline">
            <Link to="/demandas">
              <ArrowLeft /> Volver al listado
            </Link>
          </Button>
        }
      />

      {created ? (
        <CreatedResult demand={created} onCreateAnother={startOver} />
      ) : (
        <Card className="max-w-3xl">
          <CardHeader className="border-b">
            <CardTitle>Datos de la demanda</CardTitle>
            <CardDescription>
              <RequiredFieldsNote />
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={onSubmit} noValidate className="contents">
              <CardContent className="grid gap-6">
                {mutation.isError && (
                  <Alert variant="destructive">
                    <AlertTitle>No se ha podido crear la demanda</AlertTitle>
                    <AlertDescription>
                      {isApiError(mutation.error) && mutation.error.kind === 'not-found'
                        ? 'La aplicación seleccionada ya no existe. Recarga la página y elige otra.'
                        : getErrorMessage(mutation.error)}
                    </AlertDescription>
                  </Alert>
                )}
                <TitleField />
                <div className="grid gap-6 sm:grid-cols-2">
                  <ApplicationField />
                  <PriorityField />
                </div>
                <DescriptionField />
              </CardContent>
              <CardFooter className="justify-end gap-2 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => form.reset(emptyForm(presetApplicationId))}
                  disabled={mutation.isPending}
                >
                  Limpiar
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                  {mutation.isPending ? 'Creando…' : 'Crear demanda'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}
    </>
  )
}

function CreatedResult({ demand, onCreateAnother }: { demand: Demand; onCreateAnother: () => void }) {
  return (
    <div className="grid max-w-3xl gap-4">
      <Alert variant="success">
        <CheckCircle2 />
        <AlertTitle>Demanda creada correctamente</AlertTitle>
        <AlertDescription>Estos son los datos registrados por el servidor.</AlertDescription>
      </Alert>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>{demand.title}</CardTitle>
          <CardDescription>Respuesta del servidor · identificador #{demand.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <DemandSummary demand={demand} />
        </CardContent>
        <CardFooter className="flex-wrap justify-end gap-2 border-t">
          <Button variant="ghost" onClick={onCreateAnother}>
            <Plus /> Crear otra
          </Button>
          <Button asChild variant="outline">
            <Link to="/demandas">
              <ArrowLeft /> Volver al listado
            </Link>
          </Button>
          <Button asChild>
            <Link to={`/demandas/${demand.id}`}>
              <Eye /> Ver detalle
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
