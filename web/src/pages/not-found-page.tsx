import { Link } from 'react-router'
import { Compass } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-accent">
        <Compass className="size-7 text-brand-strong" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Página no encontrada</h1>
        <p className="text-sm text-muted-foreground">La dirección solicitada no existe en IT Service Manager.</p>
      </div>
      <Button asChild variant="outline">
        <Link to="/aplicaciones">Ir a aplicaciones</Link>
      </Button>
    </div>
  )
}
