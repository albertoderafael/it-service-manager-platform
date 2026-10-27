import { Link } from 'react-router'
import { ArrowLeft, SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from './page-header'

interface ResourceNotFoundProps {
  /** Texto principal, p. ej. «No existe ninguna demanda con el identificador «7»». */
  message: string
  /** Ruta del listado al que volver. */
  backTo: string
  /** Si se indica, se pinta como página completa con cabecera. */
  page?: { eyebrow: string; title: string }
}

/** Aviso de recurso inexistente (ID no válido en la URL o 404 del backend). */
export function ResourceNotFound({ message, backTo, page }: ResourceNotFoundProps) {
  const content = (
    <Card className="items-center gap-3 px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-6 text-muted-foreground" />
      </div>
      <p className="font-medium">{message}</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Puede que el identificador sea incorrecto. Vuelve al listado para localizarlo.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link to={backTo}>
          <ArrowLeft /> Volver al listado
        </Link>
      </Button>
    </Card>
  )
  if (!page) return content
  return (
    <>
      <PageHeader eyebrow={page.eyebrow} title={page.title} />
      {content}
    </>
  )
}
