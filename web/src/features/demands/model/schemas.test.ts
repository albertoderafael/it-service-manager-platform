import { describe, expect, it } from 'vitest'

import { createDemandUpdateSchema, demandCreateSchema, normalizeDescription } from './schemas'

describe('validación de formularios de demanda', () => {
  const valid = { title: 'Adaptación a la nueva normativa', description: '', priority: 'HIGH', applicationId: '1' }

  it('acepta un alta válida, recorta el título y convierte la aplicación a número', () => {
    const result = demandCreateSchema.parse({ ...valid, title: '  Adaptación  ' })
    expect(result.title).toBe('Adaptación')
    expect(result.applicationId).toBe(1)
  })

  it('exige título no vacío de hasta 150 caracteres', () => {
    expect(demandCreateSchema.safeParse({ ...valid, title: '   ' }).error?.issues[0]?.message).toBe(
      'El título es obligatorio.',
    )
    expect(demandCreateSchema.safeParse({ ...valid, title: 'a'.repeat(150) }).success).toBe(true)
    expect(demandCreateSchema.safeParse({ ...valid, title: 'a'.repeat(151) }).success).toBe(false)
  })

  it('limita la descripción a 1000 caracteres', () => {
    expect(demandCreateSchema.safeParse({ ...valid, description: 'a'.repeat(1000) }).success).toBe(true)
    expect(demandCreateSchema.safeParse({ ...valid, description: 'a'.repeat(1001) }).success).toBe(false)
  })

  it('exige prioridad válida y aplicación seleccionada', () => {
    expect(demandCreateSchema.safeParse({ ...valid, priority: 'URGENT' }).success).toBe(false)
    expect(demandCreateSchema.safeParse({ ...valid, applicationId: undefined }).success).toBe(false)
    const empty = demandCreateSchema.safeParse({ ...valid, applicationId: '' })
    expect(empty.error?.issues[0]?.message).toBe('Selecciona una aplicación.')
  })

  it('el alta no incluye el estado (lo asigna el backend)', () => {
    const result = demandCreateSchema.parse({ ...valid, status: 'COMPLETED' })
    expect(result).not.toHaveProperty('status')
  })

  it('la modificación acepta mantener el estado o una transición válida', () => {
    const schema = createDemandUpdateSchema('OPEN')
    expect(schema.safeParse({ ...valid, status: 'OPEN' }).success).toBe(true)
    expect(schema.safeParse({ ...valid, status: 'IN_PROGRESS' }).success).toBe(true)
  })

  it('la modificación rechaza una transición no permitida con un mensaje claro', () => {
    const result = createDemandUpdateSchema('IN_PROGRESS').safeParse({ ...valid, status: 'OPEN' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['status'])
    expect(result.error?.issues[0]?.message).toBe('No se puede pasar de «En curso» a «Abierta».')
  })

  it('envía la descripción vacía como null', () => {
    expect(normalizeDescription('  ')).toBeNull()
    expect(normalizeDescription(' Nueva descripción ')).toBe('Nueva descripción')
  })
})
