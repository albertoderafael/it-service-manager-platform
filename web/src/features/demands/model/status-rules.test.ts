import { describe, expect, it } from 'vitest'

import {
  canTransition,
  getNextStatuses,
  getSelectableStatuses,
  isFinalStatus,
  parseTransitionError,
} from './status-rules'
import { DEMAND_STATUSES } from './types'

describe('reglas de transición de estado de demandas', () => {
  it('permite las transiciones definidas en el backend', () => {
    expect(canTransition('OPEN', 'IN_PROGRESS')).toBe(true)
    expect(canTransition('OPEN', 'CANCELLED')).toBe(true)
    expect(canTransition('IN_PROGRESS', 'COMPLETED')).toBe(true)
    expect(canTransition('IN_PROGRESS', 'CANCELLED')).toBe(true)
  })

  it('rechaza las transiciones no definidas', () => {
    expect(canTransition('OPEN', 'COMPLETED')).toBe(false)
    expect(canTransition('IN_PROGRESS', 'OPEN')).toBe(false)
    expect(canTransition('COMPLETED', 'OPEN')).toBe(false)
    expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false)
    expect(canTransition('CANCELLED', 'IN_PROGRESS')).toBe(false)
  })

  it('mantener el mismo estado siempre es válido', () => {
    for (const status of DEMAND_STATUSES) expect(canTransition(status, status)).toBe(true)
  })

  it('COMPLETED y CANCELLED son finales', () => {
    expect(isFinalStatus('COMPLETED')).toBe(true)
    expect(isFinalStatus('CANCELLED')).toBe(true)
    expect(isFinalStatus('OPEN')).toBe(false)
    expect(isFinalStatus('IN_PROGRESS')).toBe(false)
    expect(getNextStatuses('COMPLETED')).toEqual([])
  })

  it('los estados seleccionables incluyen el actual seguido de sus transiciones', () => {
    expect(getSelectableStatuses('OPEN')).toEqual(['OPEN', 'IN_PROGRESS', 'CANCELLED'])
    expect(getSelectableStatuses('IN_PROGRESS')).toEqual(['IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    expect(getSelectableStatuses('CANCELLED')).toEqual(['CANCELLED'])
  })

  it('interpreta el mensaje del 409 del backend', () => {
    expect(parseTransitionError('Invalid demand status transition: IN_PROGRESS -> OPEN')).toEqual({
      from: 'IN_PROGRESS',
      to: 'OPEN',
    })
    expect(parseTransitionError('Otro conflicto')).toBeUndefined()
    expect(parseTransitionError('Invalid demand status transition: FOO -> OPEN')).toBeUndefined()
  })
})
