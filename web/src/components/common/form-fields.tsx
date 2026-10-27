import type { ReactNode } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

/*
 * Campos de formulario genéricos (shadcn/ui Form + React Hook Form).
 * Se conectan al formulario del componente padre mediante useFormContext,
 * por lo que solo necesitan el nombre del campo.
 */

function CharCounter({ name, max }: { name: string; max: number }) {
  const { control } = useFormContext()
  const value = (useWatch({ control, name }) as string | undefined) ?? ''
  const length = value.length
  return (
    <span
      className={cn(
        'text-xs leading-none tabular-nums text-muted-foreground',
        length > max && 'font-medium text-destructive',
      )}
      aria-live="polite"
    >
      {length}/{max}
    </span>
  )
}

interface BaseFieldProps {
  name: string
  label: string
  required?: boolean
  description?: ReactNode
}

export function TextInputField({
  name,
  label,
  required,
  description,
  maxLength,
  placeholder,
}: BaseFieldProps & { maxLength: number; placeholder?: string }) {
  const { control } = useFormContext()
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel required={required}>{label}</FormLabel>
            <CharCounter name={name} max={maxLength} />
          </div>
          <FormControl>
            <Input
              placeholder={placeholder}
              autoComplete="off"
              aria-required={required || undefined}
              {...field}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function TextareaField({
  name,
  label,
  required,
  description,
  maxLength,
  placeholder,
  rows = 4,
}: BaseFieldProps & { maxLength: number; placeholder?: string; rows?: number }) {
  const { control } = useFormContext()
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel required={required}>{label}</FormLabel>
            <CharCounter name={name} max={maxLength} />
          </div>
          <FormControl>
            <Textarea placeholder={placeholder} rows={rows} {...field} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export interface SelectOption {
  value: string
  label: ReactNode
  /** Texto secundario (p. ej. el código de la API). */
  hint?: string
  disabled?: boolean
}

export function SelectField({
  name,
  label,
  required,
  description,
  options,
  placeholder,
  disabled,
}: BaseFieldProps & {
  options: readonly SelectOption[]
  placeholder: string
  disabled?: boolean
}) {
  const { control } = useFormContext()
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel required={required}>{label}</FormLabel>
          <Select value={(field.value as string | undefined) ?? ''} onValueChange={field.onChange} disabled={disabled}>
            <FormControl>
              <SelectTrigger
                className="w-full"
                onBlur={field.onBlur}
                ref={field.ref}
                aria-required={required || undefined}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                  {option.hint && <span className="text-muted-foreground"> ({option.hint})</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function RequiredFieldsNote() {
  return (
    <p className="text-xs text-muted-foreground">
      Los campos marcados con <span className="text-destructive">*</span> son obligatorios.
    </p>
  )
}
