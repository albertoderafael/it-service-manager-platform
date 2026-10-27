/**
 * Cliente HTTP mínimo sobre fetch para consumir la API REST del backend.
 *
 * - Centraliza la URL base (VITE_API_BASE_URL, por defecto "/api").
 * - Convierte cualquier respuesta fallida en un ApiError, reconociendo el
 *   formato del backend `{ status, error, message, fieldErrors }`
 *   (ApiErrorResponse) y también el formato de error por defecto de Spring Boot.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

/** Cuerpo de error generado por GlobalExceptionHandler en el backend. */
export interface ApiErrorBody {
  status: number
  error: string
  message: string | null
  fieldErrors?: Record<string, string>
}

export type ApiErrorKind = 'network' | 'validation' | 'not-found' | 'client' | 'server'

export class ApiError extends Error {
  readonly status: number
  readonly kind: ApiErrorKind
  readonly code?: string
  readonly fieldErrors: Record<string, string>

  constructor(params: {
    message: string
    status: number
    kind: ApiErrorKind
    code?: string
    fieldErrors?: Record<string, string>
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.kind = params.kind
    this.code = params.code
    this.fieldErrors = params.fieldErrors ?? {}
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Describe cualquier error de forma comprensible para el usuario. */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Se ha producido un error inesperado.'
}

type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue | QueryValue[]>

/** Construye la query string ignorando valores vacíos. Los arrays repiten la clave. */
export function buildQueryString(params?: QueryParams): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, raw] of Object.entries(params)) {
    const values = Array.isArray(raw) ? raw : [raw]
    for (const value of values) {
      if (value === undefined || value === null || value === '') continue
      search.append(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400) return 'validation'
  if (status === 404) return 'not-found'
  if (status >= 500) return 'server'
  return 'client'
}

function defaultMessage(status: number): string {
  switch (status) {
    case 400:
      return 'La petición contiene datos no válidos.'
    case 404:
      return 'El recurso solicitado no existe.'
    case 409:
      return 'La operación entra en conflicto con el estado actual del recurso.'
    case 502:
    case 503:
    case 504:
      return 'El servidor no está disponible. Comprueba que el backend está arrancado.'
    default:
      return status >= 500
        ? `El servidor ha devuelto un error inesperado (HTTP ${status}).`
        : `No se ha podido completar la petición (HTTP ${status}).`
  }
}

/**
 * Mensaje para un error 5xx que SÍ viene del backend (formato ApiErrorResponse).
 * Los textos del servidor en errores 5xx son técnicos y están en inglés, así que
 * no se muestran al usuario: se traduce por código HTTP. Hoy los únicos 502/503
 * de negocio los produce el servicio de demandas cuando no puede consultar el
 * catálogo de aplicaciones (RestApplicationCatalog).
 */
function serverErrorMessage(status: number): string {
  switch (status) {
    case 502:
      return 'El catálogo de aplicaciones ha respondido de forma inesperada. Inténtalo de nuevo más tarde.'
    case 503:
      return 'El catálogo de aplicaciones no está disponible en este momento. Inténtalo de nuevo en unos segundos.'
    default:
      return 'Se ha producido un error inesperado en el servidor. Inténtalo de nuevo más tarde.'
  }
}

/** Interpreta el cuerpo de una respuesta de error y construye un ApiError. */
export async function toApiError(response: Response): Promise<ApiError> {
  const status = response.status
  let body: Partial<ApiErrorBody> | null = null
  try {
    const text = await response.text()
    body = text ? (JSON.parse(text) as Partial<ApiErrorBody>) : null
  } catch {
    // Cuerpo no JSON (p. ej. HTML de un proxy): se usa el mensaje por defecto.
  }

  // Formato propio del backend (ApiErrorResponse).
  const hasBackendFormat = body && typeof body.message === 'string' && body.message.length > 0
  // Formato por defecto de Spring Boot ({timestamp, status, error, path}) o cuerpo vacío
  // (por ejemplo, el proxy de Vite cuando el backend está parado).
  const message = !hasBackendFormat
    ? defaultMessage(status)
    : status >= 500
      ? serverErrorMessage(status)
      : (body!.message as string)

  return new ApiError({
    message,
    status,
    kind: kindFromStatus(status),
    code: typeof body?.error === 'string' ? body.error : undefined,
    fieldErrors:
      body?.fieldErrors && typeof body.fieldErrors === 'object' ? body.fieldErrors : undefined,
  })
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  query?: QueryParams
  body?: unknown
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal } = options
  const url = `${API_BASE_URL}${path}${buildQueryString(query)}`

  let response: Response
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError({
      message: 'No se puede conectar con el servidor. Comprueba que el backend está arrancado.',
      status: 0,
      kind: 'network',
    })
  }

  if (!response.ok) {
    throw await toApiError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const apiClient = {
  get: <T>(path: string, query?: QueryParams, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
}
