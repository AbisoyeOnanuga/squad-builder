import { useEffect, useState } from 'react'
import { SplitFlap } from '../ui/desk'

const BOOT_KEY = 'squad-desk-booted'

export function BootSequence() {
  const [reduce] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [booting, setBooting] = useState(() => sessionStorage.getItem(BOOT_KEY) !== '1')

  useEffect(() => {
    if (!booting) return
    const wait = reduce ? 280 : 1680
    const timer = window.setTimeout(() => {
      sessionStorage.setItem(BOOT_KEY, '1')
      setBooting(false)
    }, wait)
    return () => window.clearTimeout(timer)
  }, [booting, reduce])

  if (!booting) return null

  return (
    <div className="boot" role="status" aria-live="polite">
      <p className="kicker">Squad desk</p>
      <SplitFlap text="FIND A SQUAD" play={!reduce} />
      <p className="sr-only">Find a squad</p>
      <p className="boot-note">Flipping the board open</p>
    </div>
  )
}
