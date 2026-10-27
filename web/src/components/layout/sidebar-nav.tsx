import { useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { BrandMark } from './brand'
import { NAV_MODULES, type NavModule } from './navigation'

interface SidebarNavProps {
  /** Se invoca al navegar (p. ej. para cerrar el menú en móvil). */
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <BrandMark />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-white">IT Service Manager</p>
          <p className="text-[11px] tracking-wide text-sidebar-muted uppercase">
            Service &amp; Demand
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
        <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-sidebar-muted uppercase">
          Módulos
        </p>
        <ul className="space-y-1">
          {NAV_MODULES.map((module) => (
            <li key={module.id}>
              {module.comingSoon ? (
                <ComingSoonItem module={module} />
              ) : (
                <ModuleGroup module={module} onNavigate={onNavigate} />
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4 text-[11px] text-sidebar-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-cyan-400" aria-hidden="true" />
          API REST · /api
        </span>
      </div>
    </div>
  )
}

function ModuleGroup({ module, onNavigate }: { module: NavModule; onNavigate?: () => void }) {
  const location = useLocation()
  const isInModule = !!module.basePath && location.pathname.startsWith(module.basePath)
  const [open, setOpen] = useState(true)
  const Icon = module.icon

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          'group flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-white',
          isInModule && 'text-white',
        )}
      >
        <Icon className={cn('size-4 shrink-0', isInModule ? 'text-cyan-300' : 'text-sidebar-muted')} />
        <span className="flex-1 text-left">{module.label}</span>
        <ChevronRight className="size-4 text-sidebar-muted transition-transform group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
        <ul className="mt-1 ml-5 space-y-0.5 border-l border-sidebar-border pl-3">
          {module.items?.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'relative block rounded-md px-3 py-1.5 text-[13px] transition-colors hover:bg-sidebar-accent hover:text-white',
                    isActive &&
                      'bg-sidebar-accent font-medium text-white before:absolute before:top-1.5 before:bottom-1.5 before:-left-[13px] before:w-0.5 before:rounded-full before:bg-cyan-400',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ComingSoonItem({ module }: { module: NavModule }) {
  const Icon = module.icon
  return (
    <div
      className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-muted/80"
      aria-disabled="true"
      title="Módulo previsto, pendiente de implementar"
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{module.label}</span>
      <span className="shrink-0 rounded border border-sidebar-border px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
        Pronto
      </span>
    </div>
  )
}
