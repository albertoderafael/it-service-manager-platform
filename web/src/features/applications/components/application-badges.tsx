import { LevelBadge, StatusPill, type Level, type Tone } from '@/components/common/badges'
import { CRITICALITY_LABELS, STATUS_LABELS } from '../model/constants'
import type { ApplicationCriticality, ApplicationStatus } from '../model/types'

const STATUS_TONES: Record<ApplicationStatus, Tone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
}

export function StatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  return (
    <StatusPill
      label={STATUS_LABELS[status] ?? status}
      tone={STATUS_TONES[status] ?? 'neutral'}
      title={status}
      className={className}
    />
  )
}

/** Nivel visual de criticidad: número de barras "llenas" (1–4). */
const CRITICALITY_LEVELS: Record<ApplicationCriticality, Level> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
}

export function CriticalityBadge({
  criticality,
  className,
}: {
  criticality: ApplicationCriticality
  className?: string
}) {
  return (
    <LevelBadge
      level={CRITICALITY_LEVELS[criticality] ?? 1}
      label={CRITICALITY_LABELS[criticality] ?? criticality}
      title={criticality}
      className={className}
    />
  )
}
