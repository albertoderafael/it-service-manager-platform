import { createBrowserRouter, Navigate } from 'react-router'

import { AppLayout } from '@/components/layout/app-layout'
import { LoadingState } from '@/components/common/state-views'
import { applicationRoutes } from '@/features/applications/routes'
import { demandRoutes } from '@/features/demands/routes'
import { NotFoundPage } from '@/pages/not-found-page'
import { RouteErrorPage } from '@/pages/route-error-page'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    // Se muestra mientras se descarga la página inicial (rutas con carga diferida).
    hydrateFallbackElement: <LoadingState className="min-h-svh" />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <Navigate to="/aplicaciones" replace /> },
          applicationRoutes,
          demandRoutes,
          // Futuros módulos: incidencias, equipos, configuración.
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
