import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

type FlapCellProps = {
  target: string
  delay: number
  play: boolean
}

function FlapCell({ target, delay, play }: FlapCellProps) {
  const faceRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const face = faceRef.current
    if (!face) return
    const finalGlyph = target === ' ' ? '' : target
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!play || target === ' ' || reduce) {
      face.textContent = finalGlyph
      face.parentElement?.classList.remove('is-spinning')
      return
    }

    const cell = face.parentElement
    cell?.classList.add('is-spinning')
    let timer = 0
    let step = 0
    const steps = 10
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        step += 1
        if (step >= steps) {
          face.textContent = finalGlyph
          window.clearInterval(timer)
          cell?.classList.remove('is-spinning')
          return
        }
        face.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? 'A'
      }, 48)
    }, delay)

    return () => {
      window.clearTimeout(start)
      window.clearInterval(timer)
      cell?.classList.remove('is-spinning')
    }
  }, [delay, play, target])

  if (target === ' ') return <span className="flap-gap" />

  return (
    <span className="flap-cell">
      <span ref={faceRef} className="flap-face">
        {play ? '' : target}
      </span>
    </span>
  )
}

export function SplitFlap({
  text,
  play = false,
  size = 'lg',
}: {
  text: string
  play?: boolean
  size?: 'lg' | 'sm'
}) {
  const letters = text.toUpperCase().split('')
  return (
    <div className={`flap-row size-${size}`} aria-hidden="true">
      {letters.map((letter, index) => (
        <FlapCell key={`${letter}-${index}`} target={letter} delay={index * 55} play={play} />
      ))}
    </div>
  )
}

export function Button({
  tone = 'paper',
  busy = false,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'paper' | 'signal' | 'ink'; busy?: boolean }) {
  return (
    <button
      className={`desk-btn tone-${tone} ${className}`.trim()}
      aria-busy={busy}
      {...props}
      disabled={busy || props.disabled}
    >
      <span>{children}</span>
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <article className={`desk-card ${className}`.trim()}>{children}</article>
}

export function Field({
  label,
  hint,
  error,
  id,
  children,
}: {
  label: string
  hint?: string
  error?: string
  id: string
  children: ReactNode
}) {
  return (
    <label className="desk-field" htmlFor={id}>
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      className={checked ? 'desk-toggle is-on' : 'desk-toggle'}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-knob" />
      </span>
      <span>{label}</span>
    </button>
  )
}

export function Loader({ label = 'Loading the board' }: { label?: string }) {
  return (
    <div className="desk-loader" role="status">
      <span className="loader-tile" />
      <span className="loader-tile" />
      <span className="loader-tile" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
