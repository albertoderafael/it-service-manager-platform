import type { RouteObject } from 'react-router'

/*
 * Rutas del módulo de aplicaciones (montadas bajo /aplicaciones).
 * Cada página se carga bajo demanda (code splitting por ruta).
 */
export const applicationRoutes: RouteObject = {
  path: 'aplicaciones',
  children: [
    {
      index: true,
      handle: { title: 'Consultar aplicaciones' },
      lazy: () =>
        import('./pages/applications-list-page').then((m) => ({ Component: m.ApplicationsListPage })),
    },
    {
      path: 'nueva',
      handle: { title: 'Nueva aplicación' },
      lazy: () =>
        import('./pages/application-create-page').then((m) => ({ Component: m.ApplicationCreatePage })),
    },
    {
      path: 'modificar',
      handle: { title: 'Modificar aplicación' },
      lazy: () =>
        import('./pages/application-edit-selector-page').then((m) => ({
          Component: m.ApplicationEditSelectorPage,
        })),
    },
    {
      path: ':id',
      handle: { title: 'Detalle de aplicación' },
      lazy: () =>
        import('./pages/application-detail-page').then((m) => ({ Component: m.ApplicationDetailPage })),
    },
    {
      path: ':id/editar',
      handle: { title: 'Modificar aplicación' },
      lazy: () =>
        import('./pages/application-edit-page').then((m) => ({ Component: m.ApplicationEditPage })),
    },
  ],
}
