import { describe, expect, it } from 'vitest'

import { applicationCreateSchema, applicationUpdateSchema, normalizeDescription } from './schemas'

describe('validación de formularios de aplicación', () => {
  const valid = { name: 'Portal de ejemplo', description: '', criticality: 'HIGH' }

  it('acepta un alta válida y recorta espacios', () => {
    const result = applicationCreateSchema.parse({ ...valid, name: '  Portal de ejemplo  ' })
    expect(result.name).toBe('Portal de ejemplo')
  })

  it('exige nombre no vacío (equivale a @NotBlank)', () => {
    const result = applicationCreateSchema.safeParse({ ...valid, name: '   ' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('El nombre es obligatorio.')
  })

  it('limita el nombre a 100 y la descripción a 500 caracteres', () => {
    expect(applicationCreateSchema.safeParse({ ...valid, name: 'a'.repeat(100) }).success).toBe(true)
    expect(applicationCreateSchema.safeParse({ ...valid, name: 'a'.repeat(101) }).success).toBe(false)
    expect(applicationCreateSchema.safeParse({ ...valid, description: 'a'.repeat(500) }).success).toBe(true)
    expect(applicationCreateSchema.safeParse({ ...valid, description: 'a'.repeat(501) }).success).toBe(false)
  })

  it('exige una criticidad válida', () => {
    expect(applicationCreateSchema.safeParse({ ...valid, criticality: undefined }).success).toBe(false)
    expect(applicationCreateSchema.safeParse({ ...valid, criticality: 'URGENT' }).success).toBe(false)
  })

  it('en la modificación exige un estado ACTIVE o INACTIVE', () => {
    expect(applicationUpdateSchema.safeParse({ ...valid, status: 'ACTIVE' }).success).toBe(true)
    expect(applicationUpdateSchema.safeParse({ ...valid, status: 'DELETED' }).success).toBe(false)
    expect(applicationUpdateSchema.safeParse(valid).success).toBe(false)
  })

  it('envía la descripción vacía como null', () => {
    expect(normalizeDescription('   ')).toBeNull()
    expect(normalizeDescription(' Backend ')).toBe('Backend')
  })
})
