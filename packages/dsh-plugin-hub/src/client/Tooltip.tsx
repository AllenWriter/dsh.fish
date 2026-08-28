import { useId, useState, type ReactNode } from 'react'

export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  position?: 'top' | 'bottom'
  className?: string
}

export function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
}: TooltipProps): JSX.Element {
  const tooltipId = useId()
  const [visible, setVisible] = useState(false)

  if (!content) {
    return <>{children}</>
  }

  return (
    <span
      className={`dshFish__tooltipWrapper ${className}`}
      onMouseEnter={() => { setVisible(true) }}
      onMouseLeave={() => { setVisible(false) }}
      onFocus={() => { setVisible(true) }}
      onBlur={() => { setVisible(false) }}
      aria-describedby={visible ? tooltipId : undefined}
    >
      {children}
      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`dshFish__tooltip dshFish__tooltip--${position}`}
        >
          {content}
        </span>
      )}
    </span>
  )
}
