import { useState } from 'react'
import { Link } from 'react-router'
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
import { getErrorMessage } from '@/lib/api-client'
import { useCreateApplication } from '../api/applications-queries'
import {
  CriticalityField,
  DescriptionField,
  NameField,
  RequiredFieldsNote,
} from '../components/application-form-fields'
import { ApplicationSummary } from '../components/application-summary'
import {
  applicationCreateSchema,
  normalizeDescription,
  type ApplicationCreateFormInput,
  type ApplicationCreateFormValues,
} from '../model/schemas'
import type { Application } from '../model/types'

const EMPTY_FORM: ApplicationCreateFormInput = {
  name: '',
  description: '',
  criticality: undefined as unknown as ApplicationCreateFormInput['criticality'],
}

export function ApplicationCreatePage() {
  const [created, setCreated] = useState<Application | null>(null)
  const mutation = useCreateApplication()

  const form = useForm<ApplicationCreateFormInput, unknown, ApplicationCreateFormValues>({
    resolver: zodResolver(applicationCreateSchema),
    defaultValues: EMPTY_FORM,
    mode: 'onSubmit',
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await mutation.mutateAsync({
        name: values.name,
        description: normalizeDescription(values.description),
        criticality: values.criticality,
      })
      setCreated(result)
      toast.success('Aplicación creada', { description: `«${result.name}» con identificador #${result.id}.` })
    } catch (error) {
      applyServerFieldErrors(error, form.setError, ['name', 'description', 'criticality'])
    }
  })

  const startOver = () => {
    form.reset(EMPTY_FORM)
    mutation.reset()
    setCreated(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Aplicaciones"
        title="Nueva aplicación"
        description="El identificador y el estado inicial los asigna el servidor."
        actions={
          <Button asChild variant="outline">
            <Link to="/aplicaciones">
              <ArrowLeft /> Volver al listado
            </Link>
          </Button>
        }
      />

      {created ? (
        <CreatedResult application={created} onCreateAnother={startOver} />
      ) : (
        <Card className="max-w-3xl">
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
                    <AlertTitle>No se ha podido crear la aplicación</AlertTitle>
                    <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
                  </Alert>
                )}
                <div className="grid gap-6 sm:grid-cols-[1fr_16rem]">
                  <NameField />
                  <CriticalityField />
                </div>
                <DescriptionField />
              </CardContent>
              <CardFooter className="justify-end gap-2 border-t">
                <Button type="button" variant="ghost" onClick={() => form.reset(EMPTY_FORM)} disabled={mutation.isPending}>
                  Limpiar
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                  {mutation.isPending ? 'Creando…' : 'Crear aplicación'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}
    </>
  )
}

function CreatedResult({
  application,
  onCreateAnother,
}: {
  application: Application
  onCreateAnother: () => void
}) {
  return (
    <div className="grid max-w-3xl gap-4">
      <Alert variant="success">
        <CheckCircle2 />
        <AlertTitle>Aplicación creada correctamente</AlertTitle>
        <AlertDescription>
          Estos son los datos registrados por el servidor.
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>{application.name}</CardTitle>
          <CardDescription>Respuesta del servidor · identificador #{application.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicationSummary application={application} />
        </CardContent>
        <CardFooter className="flex-wrap justify-end gap-2 border-t">
          <Button variant="ghost" onClick={onCreateAnother}>
            <Plus /> Crear otra
          </Button>
          <Button asChild variant="outline">
            <Link to="/aplicaciones">
              <ArrowLeft /> Volver al listado
            </Link>
          </Button>
          <Button asChild>
            <Link to={`/aplicaciones/${application.id}`}>
              <Eye /> Ver detalle
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
