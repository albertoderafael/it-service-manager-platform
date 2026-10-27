import {
  AppWindow,
  ClipboardList,
  Settings,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavLeaf {
  label: string
  to: string
  /** Si es true, solo se marca activa con coincidencia exacta de ruta. */
  end?: boolean
}

export interface NavModule {
  id: string
  label: string
  icon: LucideIcon
  /** Rutas cuyo prefijo pertenece al módulo (para abrir el grupo automáticamente). */
  basePath?: string
  items?: NavLeaf[]
  /** Módulos previstos pero todavía no implementados. */
  comingSoon?: boolean
}

/**
 * Configuración declarativa del menú lateral. Añadir un módulo nuevo consiste
 * en incorporar aquí su entrada y registrar sus rutas en el router.
 */
export const NAV_MODULES: NavModule[] = [
  {
    id: 'applications',
    label: 'Aplicaciones',
    icon: AppWindow,
    basePath: '/aplicaciones',
    items: [
      { label: 'Consultar aplicaciones', to: '/aplicaciones', end: true },
      { label: 'Nueva aplicación', to: '/aplicaciones/nueva', end: true },
      { label: 'Modificar aplicación', to: '/aplicaciones/modificar', end: true },
    ],
  },
  {
    id: 'demands',
    label: 'Demandas',
    icon: ClipboardList,
    basePath: '/demandas',
    items: [
      { label: 'Consultar demandas', to: '/demandas', end: true },
      { label: 'Nueva demanda', to: '/demandas/nueva', end: true },
      { label: 'Modificar demanda', to: '/demandas/modificar', end: true },
    ],
  },
  { id: 'incidents', label: 'Incidencias', icon: TriangleAlert, comingSoon: true },
  { id: 'teams', label: 'Equipos', icon: Users, comingSoon: true },
  { id: 'settings', label: 'Configuración', icon: Settings, comingSoon: true },
]
