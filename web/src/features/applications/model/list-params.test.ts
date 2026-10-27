import { describe, expect, it } from 'vitest'

import { parseListParams, serializeListParams, toApiQuery } from './list-params'
import { DEFAULT_LIST_PARAMS } from './constants'

describe('parámetros del listado de aplicaciones', () => {
  it('usa los valores por defecto del backend cuando la URL está vacía', () => {
    expect(parseListParams(new URLSearchParams())).toEqual({
      ...DEFAULT_LIST_PARAMS,
      status: undefined,
      criticality: undefined,
    })
  })

  it('interpreta filtros, página (1-based en URL), tamaño y orden', () => {
    const params = parseListParams(
      new URLSearchParams('estado=INACTIVE&criticidad=HIGH&pagina=3&tamano=20&orden=name,desc'),
    )
    expect(params).toEqual({
      status: 'INACTIVE',
      criticality: 'HIGH',
      page: 2,
      size: 20,
      sortField: 'name',
      sortDirection: 'desc',
    })
  })

  it('descarta valores no válidos en la URL', () => {
    const params = parseListParams(
      new URLSearchParams('estado=FOO&criticidad=x&pagina=-1&tamano=7&orden=password,up'),
    )
    expect(params).toEqual({ ...DEFAULT_LIST_PARAMS, status: undefined, criticality: undefined })
  })

  it('serializa omitiendo los valores por defecto y es reversible', () => {
    expect(serializeListParams(DEFAULT_LIST_PARAMS).toString()).toBe('')
    const original = {
      status: 'ACTIVE' as const,
      criticality: 'CRITICAL' as const,
      page: 1,
      size: 50,
      sortField: 'status' as const,
      sortDirection: 'desc' as const,
    }
    expect(parseListParams(serializeListParams(original))).toEqual(original)
  })

  it('genera la consulta con el formato de Spring Data (page 0-based, sort=campo,dir)', () => {
    expect(
      toApiQuery({ ...DEFAULT_LIST_PARAMS, status: 'ACTIVE', page: 2, sortField: 'name', sortDirection: 'desc' }),
    ).toEqual({ status: 'ACTIVE', criticality: undefined, page: 2, size: 10, sort: 'name,desc' })
  })
})
