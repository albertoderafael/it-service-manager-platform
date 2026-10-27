/** Convierte un parámetro de ruta (:id) en un identificador numérico válido. */
export function parseEntityId(raw: string | null | undefined): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : undefined
}
