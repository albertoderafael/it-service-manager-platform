import { describe, expect, it } from 'vitest'

import { nextSort, parseIdParam, parsePageParam, parseSortParam } from './list-params'

describe('utilidades de listados', () => {
  it('convierte la página de la URL (1-based) a Spring Data (0-based)', () => {
    expect(parsePageParam('3')).toBe(2)
    expect(parsePageParam('0')).toBe(0)
    expect(parsePageParam(null)).toBe(0)
  })

  it('solo acepta identificadores enteros positivos', () => {
    expect(parseIdParam('12')).toBe(12)
    expect(parseIdParam('0')).toBeUndefined()
    expect(parseIdParam('1.5')).toBeUndefined()
    expect(parseIdParam(null)).toBeUndefined()
  })

  it('valida campo y dirección de orden por separado', () => {
    const fallback = { field: 'id' as const, direction: 'asc' as const }
    expect(parseSortParam('name,desc', ['id', 'name'] as const, fallback)).toEqual({ field: 'name', direction: 'desc' })
    expect(parseSortParam('name,up', ['id', 'name'] as const, fallback)).toEqual({ field: 'name', direction: 'asc' })
  })

  it('alterna la dirección en el mismo campo y empieza ascendente en uno nuevo', () => {
    expect(nextSort({ sortField: 'id', sortDirection: 'asc' }, 'id')).toEqual({ sortField: 'id', sortDirection: 'desc' })
    expect(nextSort({ sortField: 'id', sortDirection: 'desc' }, 'id')).toEqual({ sortField: 'id', sortDirection: 'asc' })
    expect(nextSort({ sortField: 'id', sortDirection: 'desc' }, 'name')).toEqual({ sortField: 'name', sortDirection: 'asc' })
  })
})
