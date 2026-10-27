import { describe, expect, it } from 'vitest'

import { parseDemandListParams, serializeDemandListParams, toDemandApiQuery } from './list-params'
import { DEFAULT_DEMAND_LIST_PARAMS } from './constants'
import type { DemandListParams } from './types'

describe('parámetros del listado de demandas', () => {
  it('usa los valores por defecto cuando la URL está vacía', () => {
    expect(parseDemandListParams(new URLSearchParams())).toEqual({
      ...DEFAULT_DEMAND_LIST_PARAMS,
      applicationId: undefined,
      status: undefined,
      priority: undefined,
    })
  })

  it('interpreta filtros combinados, página, tamaño y orden', () => {
    const params = parseDemandListParams(
      new URLSearchParams(
        'aplicacion=1&estado=IN_PROGRESS&prioridad=HIGH&pagina=2&tamano=20&orden=application.name,asc',
      ),
    )
    expect(params).toEqual({
      applicationId: 1,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      page: 1,
      size: 20,
      sortField: 'application.name',
      sortDirection: 'asc',
    })
  })

  it('descarta valores no válidos', () => {
    const params = parseDemandListParams(
      new URLSearchParams('aplicacion=abc&estado=CLOSED&prioridad=URGENT&pagina=0&tamano=3&orden=secret,desc'),
    )
    expect(params).toEqual({
      ...DEFAULT_DEMAND_LIST_PARAMS,
      applicationId: undefined,
      status: undefined,
      priority: undefined,
      sortDirection: 'desc',
    })
    expect(parseDemandListParams(new URLSearchParams('aplicacion=-4')).applicationId).toBeUndefined()
  })

  it('serializa omitiendo valores por defecto y es reversible', () => {
    expect(serializeDemandListParams(DEFAULT_DEMAND_LIST_PARAMS).toString()).toBe('')
    const original: DemandListParams = {
      applicationId: 3,
      status: 'OPEN',
      priority: 'CRITICAL',
      page: 4,
      size: 50,
      sortField: 'updatedAt',
      sortDirection: 'asc',
    }
    expect(parseDemandListParams(serializeDemandListParams(original))).toEqual(original)
  })

  it('genera la consulta de GET /api/demands', () => {
    expect(
      toDemandApiQuery({ ...DEFAULT_DEMAND_LIST_PARAMS, applicationId: 1, status: 'OPEN', priority: 'HIGH' }),
    ).toEqual({
      applicationId: 1,
      status: 'OPEN',
      priority: 'HIGH',
      page: 0,
      size: 10,
      sort: 'id,desc',
    })
  })
})
