import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import {
  ErrorIcon,
  InfoIcon,
  TipIcon,
  WarningIcon,
  ApprovedIcon,
} from '@/shared/ui/icon'

export const CALLOUT_TYPES = [
  'tip',
  'info',
  'note',
  'warning',
  'caution',
  'danger',
  'success',
  'important',
] as const

export type CalloutType = (typeof CALLOUT_TYPES)[number]

const ALIASES: Record<string, CalloutType> = {
  tip: 'tip',
  hint: 'tip',
  info: 'info',
  note: 'note',
  warning: 'warning',
  caution: 'caution',
  danger: 'danger',
  error: 'danger',
  success: 'success',
  important: 'important',
}

export function isCalloutType(value: string): value is CalloutType {
  return value.toLowerCase() in ALIASES
}

export function normalizeCalloutType(value: string): CalloutType | undefined {
  return ALIASES[value.trim().toLowerCase()]
}

const TONE: Record<CalloutType, { wrap: string; label: string; icon: typeof TipIcon }> = {
  tip: {
    wrap: 'border-primary/25 bg-accent/40',
    label: 'text-primary',
    icon: TipIcon,
  },
  info: {
    wrap: 'border-border bg-muted/60',
    label: 'text-foreground',
    icon: InfoIcon,
  },
  note: {
    wrap: 'border-border bg-muted/60',
    label: 'text-muted-foreground',
    icon: InfoIcon,
  },
  warning: {
    wrap: 'border-destructive/25 bg-destructive/5',
    label: 'text-destructive',
    icon: WarningIcon,
  },
  caution: {
    wrap: 'border-destructive/25 bg-destructive/5',
    label: 'text-destructive',
    icon: WarningIcon,
  },
  danger: {
    wrap: 'border-destructive/40 bg-destructive/10',
    label: 'text-destructive',
    icon: ErrorIcon,
  },
  success: {
    wrap: 'border-primary/20 bg-accent/50',
    label: 'text-primary',
    icon: ApprovedIcon,
  },
  important: {
    wrap: 'border-primary/30 bg-accent/50',
    label: 'text-primary',
    icon: TipIcon,
  },
}

const TITLE: Record<CalloutType, string> = {
  tip: 'Tip',
  info: 'Info',
  note: 'Note',
  warning: 'Warning',
  caution: 'Caution',
  danger: 'Danger',
  success: 'Success',
  important: 'Important',
}

export function Callout({
  type = 'info',
  title,
  children,
}: {
  type?: string
  title?: string
  children?: ReactNode
}) {
  const kind = normalizeCalloutType(type) ?? 'info'
  const tone = TONE[kind]
  const Icon = tone.icon
  return (
    <aside
      className={cn('my-5 rounded-xl border px-4 py-3 text-[15px] leading-6', tone.wrap)}
      data-callout={kind}
    >
      <p className={cn('mb-1.5 flex items-center gap-2 text-sm font-semibold', tone.label)}>
        <Icon className="size-4 shrink-0" weight="bold" />
        {title ?? TITLE[kind]}
      </p>
      <div className="text-foreground/90 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
        {children}
      </div>
    </aside>
  )
}

export function Tip(props: { title?: string; children?: ReactNode }) {
  return <Callout type="tip" {...props} />
}
export function Info(props: { title?: string; children?: ReactNode }) {
  return <Callout type="info" {...props} />
}
export function Note(props: { title?: string; children?: ReactNode }) {
  return <Callout type="note" {...props} />
}
export function Warning(props: { title?: string; children?: ReactNode }) {
  return <Callout type="warning" {...props} />
}
export function Caution(props: { title?: string; children?: ReactNode }) {
  return <Callout type="caution" {...props} />
}
export function Danger(props: { title?: string; children?: ReactNode }) {
  return <Callout type="danger" {...props} />
}
