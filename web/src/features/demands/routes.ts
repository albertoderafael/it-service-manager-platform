import type { RouteObject } from 'react-router'

/*
 * Rutas del módulo de demandas (montadas bajo /demandas).
 * Cada página se carga bajo demanda (code splitting por ruta).
 */
export const demandRoutes: RouteObject = {
  path: 'demandas',
  children: [
    {
      index: true,
      handle: { title: 'Consultar demandas' },
      lazy: () => import('./pages/demands-list-page').then((m) => ({ Component: m.DemandsListPage })),
    },
    {
      path: 'nueva',
      handle: { title: 'Nueva demanda' },
      lazy: () => import('./pages/demand-create-page').then((m) => ({ Component: m.DemandCreatePage })),
    },
    {
      path: 'modificar',
      handle: { title: 'Modificar demanda' },
      lazy: () =>
        import('./pages/demand-edit-selector-page').then((m) => ({ Component: m.DemandEditSelectorPage })),
    },
    {
      path: ':id',
      handle: { title: 'Detalle de demanda' },
      lazy: () => import('./pages/demand-detail-page').then((m) => ({ Component: m.DemandDetailPage })),
    },
    {
      path: ':id/editar',
      handle: { title: 'Modificar demanda' },
      lazy: () => import('./pages/demand-edit-page').then((m) => ({ Component: m.DemandEditPage })),
    },
  ],
}
