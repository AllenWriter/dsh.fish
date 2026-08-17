import { useEffect, useRef, useState } from 'react'
import { useT } from '@/shared/config/i18n'
import { cn } from '@/shared/lib/utils'
import { ConfirmIcon, CopyIcon } from '@/shared/ui/icon'
import { IconSwap } from '@/shared/ui/icon-swap'

/** How long the check stays before the button offers to copy again. */
const CONFIRM_MS = 1600

/**
 * Copy-to-clipboard affordance for a block of text.
 *
 * The icon swap is the whole interaction, and it runs through the shared
 * `IconSwap` slot so it moves exactly like every other stateful mark here.
 *
 * A failed clipboard write — an insecure origin, a denied permission — leaves
 * the button in its idle state. That is the honest report: nothing was copied,
 * so nothing claims it was.
 */
export function CopyButton({ text, className }: { text: string; className?: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), CONFIRM_MS)
  }

  return (
    <button
      type="button"
      aria-label={t(copied ? 'common.copied' : 'common.copy')}
      onClick={() => void copy()}
      className={cn(
        'press hit-area grid size-7 place-items-center rounded-md border border-border bg-card',
        className,
      )}
    >
      <IconSwap swapKey={copied ? 'copied' : 'idle'}>
        {copied ? (
          <ConfirmIcon className="size-3.5 text-primary" weight="bold" />
        ) : (
          <CopyIcon className="size-3.5" weight="bold" />
        )}
      </IconSwap>
    </button>
  )
}
