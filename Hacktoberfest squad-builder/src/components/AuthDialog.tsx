import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { errorMessage } from '../lib/errors'
import { Button, Field } from '../ui/desk'

export function AuthDialog() {
  const { signInOpen, closeSignIn, login, register } = useAuth()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState<'signin' | 'register'>('register')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (signInOpen && !dialog.open) dialog.showModal()
    if (!signInOpen && dialog.open) dialog.close()
  }, [signInOpen])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'register') {
        if (name.trim().length < 2) {
          setError('Add the name people should call you.')
          return
        }
        await register({ name: name.trim(), email: email.trim(), password })
      } else {
        await login({ email: email.trim(), password })
      }
      setPassword('')
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="auth-dialog"
      aria-labelledby={titleId}
      data-lenis-prevent
      onClose={closeSignIn}
    >
      <form onSubmit={(event) => void onSubmit(event)}>
        <p className="kicker">Account</p>
        <h2 id={titleId}>{mode === 'register' ? 'Put your name on the desk' : 'Welcome back'}</h2>
        <p className="lede">
          Email and a password. No extra provider keys. The address stays in the account, not on the card.
        </p>
        {mode === 'register' ? (
          <Field id="account-name" label="Name">
            <input id="account-name" value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} />
          </Field>
        ) : null}
        <Field id="account-email" label="Email">
          <input
            id="account-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field id="account-password" label="Password" hint="At least 8 characters.">
          <input
            id="account-password"
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? <p className="form-alert" role="alert">{error}</p> : null}
        <div className="form-actions">
          <Button tone="signal" type="submit" busy={busy}>
            {mode === 'register' ? 'Create account' : 'Sign in'}
          </Button>
          <Button tone="ink" type="button" onClick={closeSignIn}>
            Close
          </Button>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setMode(mode === 'register' ? 'signin' : 'register')
            setError('')
          }}
        >
          {mode === 'register' ? 'I already have an account' : 'I need an account'}
        </button>
      </form>
    </dialog>
  )
}
