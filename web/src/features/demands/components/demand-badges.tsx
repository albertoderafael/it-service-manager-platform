import { LevelBadge, StatusPill, type Level, type Tone } from '@/components/common/badges'
import { DEMAND_PRIORITY_LABELS, DEMAND_STATUS_LABELS } from '../model/constants'
import type { DemandPriority, DemandStatus } from '../model/types'

const DEMAND_STATUS_TONES: Record<DemandStatus, Tone> = {
  OPEN: 'info',
  IN_PROGRESS: 'brand',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
}

export function DemandStatusBadge({ status, className }: { status: DemandStatus; className?: string }) {
  return (
    <StatusPill
      label={DEMAND_STATUS_LABELS[status] ?? status}
      tone={DEMAND_STATUS_TONES[status] ?? 'neutral'}
      title={status}
      className={className}
    />
  )
}

const PRIORITY_LEVELS: Record<DemandPriority, Level> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
}

export function DemandPriorityBadge({
  priority,
  className,
}: {
  priority: DemandPriority
  className?: string
}) {
  return (
    <LevelBadge
      level={PRIORITY_LEVELS[priority] ?? 1}
      label={DEMAND_PRIORITY_LABELS[priority] ?? priority}
      title={priority}
      className={className}
    />
  )
}
