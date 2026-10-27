import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const ALL = '__ALL__'

export interface FilterOption<V extends string> {
  value: V
  label: string
  /** Texto secundario (p. ej. el código de la API). */
  hint?: string
}

interface FilterSelectProps<V extends string> {
  id: string
  label: string
  allLabel: string
  value: V | undefined
  options: readonly FilterOption<V>[]
  onChange: (value: V | undefined) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

/** Desplegable de filtro opcional con la opción «Todos». */
export function FilterSelect<V extends string>({
  id,
  label,
  allLabel,
  value,
  options,
  onChange,
  disabled,
  placeholder,
  className,
}: FilterSelectProps<V>) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value ?? ALL}
        onValueChange={(next) => onChange(next === ALL ? undefined : (next as V))}
        disabled={disabled}
      >
        <SelectTrigger id={id} className={cn('w-full sm:w-44', className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
              {option.hint && <span className="text-muted-foreground"> ({option.hint})</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
