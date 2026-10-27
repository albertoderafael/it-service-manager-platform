import { useState } from 'react'
import { Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { BrandMark } from './brand'
import { SidebarNav } from './sidebar-nav'

export function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/70 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu />
      </Button>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-none p-0 text-sidebar-foreground [&>button]:text-white">
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <SheetDescription className="sr-only">Módulos de IT Service Manager</SheetDescription>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-3 lg:hidden">
        <BrandMark className="size-8 bg-sidebar" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold tracking-tight">IT Service Manager</p>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Gestión de servicios, aplicaciones y demandas IT
        </p>
      </div>
    </header>
  )
}
