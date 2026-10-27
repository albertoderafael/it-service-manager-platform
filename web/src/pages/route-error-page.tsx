import { isRouteErrorResponse, useRouteError } from 'react-router'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'

/** Captura errores inesperados de renderizado para no dejar la pantalla en blanco. */
export function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Error desconocido'

  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-7 text-destructive" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Se ha producido un error inesperado</h1>
        <p className="max-w-lg text-sm text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" onClick={() => window.location.assign('/aplicaciones')}>
        Volver al inicio
      </Button>
    </div>
  )
}
