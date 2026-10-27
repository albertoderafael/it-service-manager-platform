import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/25 to-sky-500/10 ring-1 ring-cyan-400/40',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5 text-cyan-300" fill="none" aria-hidden="true">
        <path
          d="M5 7h14M5 12h14M5 17h9"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="18.5" cy="17" r="1.6" fill="currentColor" />
      </svg>
    </div>
  )
}
