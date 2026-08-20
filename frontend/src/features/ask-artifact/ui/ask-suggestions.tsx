import { useMemo, useState } from 'react'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { useT } from '@/shared/config/i18n'
import { EASE_OUT } from '@/shared/lib/ease'
import { cn } from '@/shared/lib/utils'
import { ShuffleIcon } from '@/shared/ui/icon'
import { Button } from '@/shared/ui/motion/button'
import { pickSuggestedQuestions } from '../lib/suggested-questions'

/**
 * Openers for a reader who has not asked anything yet.
 *
 * A blank composer is the hardest part of a Q&A surface: the reader has to
 * guess both what the thing knows and how to phrase it. Three concrete
 * questions answer both at once, and shuffling replaces them rather than
 * listing all twelve — a wall of questions is a second reading task, not help.
 *
 * Motion: the rows fade up once when the card scrolls into view, staggered so
 * the group reads as a set of alternatives rather than one block of text. A
 * shuffle redraws faster than the first reveal, because that pass is the
 * interface answering a click, not introducing itself. Nothing loops — these
 * are click targets, and a target that keeps moving is a target you miss.
 */
export function AskSuggestions({
  seed,
  onAsk,
  className,
}: {
  seed: string
  onAsk: (question: string) => void
  className?: string
}) {
  const t = useT()
  const reduce = useReducedMotion()
  const [round, setRound] = useState(0)
  const keys = useMemo(() => pickSuggestedQuestions(`${seed}:${round}`), [seed, round])

  const first = round === 0
  const list: Variants = {
    hidden: {},
    shown: {
      transition: { staggerChildren: reduce ? 0 : first ? 0.06 : 0.04 },
    },
  }
  const row: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 6 },
    shown: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduce ? 0.15 : first ? 0.26 : 0.18,
        ease: EASE_OUT,
      },
    },
  }

  return (
    <section className={cn('rounded-xl border border-border bg-card', className)}>
      <div className="flex items-center gap-2 px-4 pt-3">
        <h2 className="me-auto text-sm font-medium">{t('ask.suggested.title')}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('ask.suggested.shuffle')}
          onClick={() => setRound((current) => current + 1)}
          className="-me-1.5 text-muted-foreground"
        >
          <ShuffleIcon className="size-4" weight="bold" />
        </Button>
      </div>

      {/* Re-keying deals a fresh hand: the replacement rows animate in from
          their own `hidden` state instead of the old text swapping in place. */}
      <motion.ul
        key={round}
        variants={list}
        initial="hidden"
        {...(first
          ? { whileInView: 'shown', viewport: { once: true, margin: '-40px' } }
          : { animate: 'shown' })}
        className="px-1.5 pb-1.5 pt-1"
      >
        {keys.map((key) => {
          const question = t(key)
          return (
            <motion.li key={key} variants={row}>
              <button
                type="button"
                onClick={() => onAsk(question)}
                className="press w-full rounded-md px-2.5 py-2 text-start text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {question}
              </button>
            </motion.li>
          )
        })}
      </motion.ul>
    </section>
  )
}
