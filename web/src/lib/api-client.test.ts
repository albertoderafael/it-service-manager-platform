import { describe, expect, it } from 'vitest'

import { buildQueryString, toApiError } from './api-client'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('api-client', () => {
  it('omite parámetros vacíos en la query string', () => {
    expect(buildQueryString({ status: undefined, criticality: '', page: 0, sort: 'id,asc' })).toBe(
      '?page=0&sort=id%2Casc',
    )
    expect(buildQueryString({})).toBe('')
  })

  it('interpreta el error de validación del backend (ApiErrorResponse)', async () => {
    const error = await toApiError(
      json(400, {
        status: 400,
        error: 'VALIDATION_ERROR',
        message: 'La petición contiene campos inválidos',
        fieldErrors: { name: 'must not be blank' },
      }),
    )
    expect(error.kind).toBe('validation')
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toBe('La petición contiene campos inválidos')
    expect(error.fieldErrors).toEqual({ name: 'must not be blank' })
  })

  it('interpreta el 404 del backend (RESOURCE_ERROR)', async () => {
    const error = await toApiError(
      json(404, { status: 404, error: 'RESOURCE_ERROR', message: 'Application not found: 99', fieldErrors: {} }),
    )
    expect(error.kind).toBe('not-found')
    expect(error.message).toBe('Application not found: 99')
  })

  it('usa un mensaje por defecto con el formato de error estándar de Spring o cuerpos vacíos', async () => {
    const spring = await toApiError(
      json(500, { timestamp: '2026-09-24T10:00:00Z', status: 500, error: 'Internal Server Error', path: '/api/applications' }),
    )
    expect(spring.kind).toBe('server')
    expect(spring.message).toContain('HTTP 500')

    const empty = await toApiError(new Response('', { status: 502 }))
    expect(empty.message).toContain('backend está arrancado')
  })

  it('traduce los 5xx del backend en lugar de mostrar su texto técnico', async () => {
    const unavailable = await toApiError(
      json(503, { status: 503, error: 'RESOURCE_ERROR', message: 'Application Catalog is unavailable', fieldErrors: {} }),
    )
    expect(unavailable.kind).toBe('server')
    expect(unavailable.message).toContain('catálogo de aplicaciones no está disponible')

    const badGateway = await toApiError(
      json(502, { status: 502, error: 'RESOURCE_ERROR', message: 'Unexpected response from Application Catalog', fieldErrors: {} }),
    )
    expect(badGateway.message).toContain('respondido de forma inesperada')

    const internal = await toApiError(
      json(500, { status: 500, error: 'INTERNAL_ERROR', message: 'Unexpected error', fieldErrors: {} }),
    )
    expect(internal.code).toBe('INTERNAL_ERROR')
    expect(internal.message).toContain('error inesperado en el servidor')
  })
})
