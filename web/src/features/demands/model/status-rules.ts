import type { DemandStatus } from './types'

/*
 * Reglas de transición de estado. Reflejan Demand.changeStatus() del backend:
 *   OPEN → IN_PROGRESS | CANCELLED
 *   IN_PROGRESS → COMPLETED | CANCELLED
 *   COMPLETED y CANCELLED son estados finales.
 *   Mantener el mismo estado siempre es válido.
 * El backend sigue siendo la autoridad: si rechaza un cambio, responde 409.
 */

const NEXT_STATUSES: Record<DemandStatus, readonly DemandStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

/** Estados a los que se puede pasar desde `from` (sin incluir el propio estado). */
export function getNextStatuses(from: DemandStatus): readonly DemandStatus[] {
  return NEXT_STATUSES[from] ?? []
}

/** ¿Es válido pasar de `from` a `to`? Mantener el estado es válido. */
export function canTransition(from: DemandStatus, to: DemandStatus): boolean {
  return from === to || getNextStatuses(from).includes(to)
}

/** Estados seleccionables al modificar: el actual y sus transiciones válidas. */
export function getSelectableStatuses(from: DemandStatus): readonly DemandStatus[] {
  return [from, ...getNextStatuses(from)]
}

export function isFinalStatus(status: DemandStatus): boolean {
  return getNextStatuses(status).length === 0
}

/**
 * Interpreta el mensaje de un 409 del backend
 * ("Invalid demand status transition: IN_PROGRESS -> OPEN").
 */
export function parseTransitionError(
  message: string,
): { from: DemandStatus; to: DemandStatus } | undefined {
  const match = /transition:\s*([A-Z_]+)\s*->\s*([A-Z_]+)/.exec(message)
  if (!match) return undefined
  const [, from, to] = match
  const known = Object.keys(NEXT_STATUSES)
  if (!known.includes(from!) || !known.includes(to!)) return undefined
  return { from: from as DemandStatus, to: to as DemandStatus }
}
