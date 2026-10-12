import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import * as desk from '../lib/desk'
import { errorMessage } from '../lib/errors'
import { fieldErrors, parseSkills, teamSchema } from '../lib/profile'
import { Button, Field } from '../ui/desk'

export function TeamFormPage() {
  const { user, ready, openSignIn } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [eventName, setEventName] = useState('Hacktoberfest')
  const [pitch, setPitch] = useState('')
  const [seats, setSeats] = useState(4)
  const [roles, setRoles] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    const parsed = teamSchema.safeParse({
      name,
      event: eventName,
      pitch,
      seats,
      neededRoles: parseSkills(roles),
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setBusy(true)
    setSaveError('')
    try {
      const team = await desk.createTeam(user, parsed.data)
      navigate(`/teams/${team.id}`)
    } catch (error) {
      setSaveError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  if (!ready) return null
  if (!user) {
    return (
      <section className="panel narrow">
        <h1>Open a squad</h1>
        <p className="lede">Sign in before you post seats.</p>
        <Button tone="signal" type="button" onClick={openSignIn}>
          Sign in
        </Button>
      </section>
    )
  }

  return (
    <section className="panel narrow">
      <p className="kicker">New squad</p>
      <h1>Open a squad</h1>
      <form onSubmit={(event) => void onSubmit(event)}>
        <Field id="team-name" label="Squad name" error={errors.name}>
          <input id="team-name" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field id="team-event" label="Event" error={errors.event}>
          <input id="team-event" value={eventName} onChange={(event) => setEventName(event.target.value)} />
        </Field>
        <Field id="team-pitch" label="Pitch" error={errors.pitch} hint="What are you building, and who is already in?">
          <textarea id="team-pitch" rows={5} value={pitch} onChange={(event) => setPitch(event.target.value)} />
        </Field>
        <Field id="team-seats" label="Seats" error={errors.seats}>
          <input
            id="team-seats"
            type="number"
            min={2}
            max={8}
            value={seats}
            onChange={(event) => setSeats(Number(event.target.value))}
          />
        </Field>
        <Field id="team-roles" label="Roles still needed" error={errors.neededRoles} hint="Comma separated.">
          <input id="team-roles" value={roles} onChange={(event) => setRoles(event.target.value)} />
        </Field>
        {saveError ? <p className="form-alert" role="alert">{saveError}</p> : null}
        <Button tone="signal" type="submit" busy={busy}>
          {busy ? 'Posting' : 'Post the squad'}
        </Button>
      </form>
    </section>
  )
}
