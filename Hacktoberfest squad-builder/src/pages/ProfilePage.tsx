import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ProfileCard } from '../components/ProfileCard'
import * as desk from '../lib/desk'
import { errorMessage } from '../lib/errors'
import {
  availabilityLabel,
  availabilityValues,
  browserTimezone,
  fieldErrors,
  intentLabel,
  intentValues,
  parseSkills,
  profileSchema,
  timezoneOptions,
  type ProfileInput,
} from '../lib/profile'
import { Button, Field, Loader, Toggle } from '../ui/desk'

const zones = timezoneOptions()

function blankProfile(name: string): ProfileInput {
  return {
    displayName: name,
    role: '',
    skills: [],
    event: 'Hacktoberfest',
    timezone: browserTimezone(),
    availability: 'flexible',
    intent: 'seeking',
    github: '',
    discord: '',
    bio: '',
    open: true,
  }
}

export function ProfilePage() {
  const { user, ready, openSignIn } = useAuth()
  const [form, setForm] = useState<ProfileInput | null>(null)
  const [skillText, setSkillText] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [saveError, setSaveError] = useState('')
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [drafting, setDrafting] = useState(false)

  useEffect(() => {
    if (!ready || !user) return
    let cancelled = false
    const userId = user.id
    desk.getProfile(userId)
      .then((profile) => {
        if (cancelled) return
        const next = profile ?? blankProfile(user.name)
        setForm(next)
        setSkillText(next.skills.join(', '))
        setLoadedFor(userId)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setSaveError(errorMessage(error))
        setLoadedFor(userId)
      })
    return () => {
      cancelled = true
    }
  }, [ready, user])

  const loading = !ready || (user !== null && loadedFor !== user.id)

  function patch(partial: Partial<ProfileInput>) {
    setForm((current) => (current ? { ...current, ...partial } : current))
  }

  function currentInput(): ProfileInput | null {
    if (!form) return null
    return { ...form, skills: parseSkills(skillText) }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    const input = currentInput()
    if (!input) return
    const parsed = profileSchema.safeParse(input)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      setSaveError('')
      return
    }
    setBusy(true)
    setErrors({})
    setSaveError('')
    try {
      const saved = await desk.saveProfile(user.id, parsed.data)
      setForm(saved)
      setSkillText(saved.skills.join(', '))
      setNotice('Your card is on the board.')
    } catch (error) {
      setSaveError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function draftInvite() {
    const input = currentInput()
    if (!input) return
    const parsed = profileSchema.safeParse(input)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setDrafting(true)
    setNotice('')
    try {
      const result = await desk.draftBio(parsed.data)
      patch({ bio: result.text })
      setNotice(result.notice ?? 'Draft ready. Edit it before you save.')
    } finally {
      setDrafting(false)
    }
  }

  if (!ready || loading) return <Loader label="Loading your card" />

  if (!user) {
    return (
      <section className="panel narrow">
        <h1>Your card</h1>
        <p className="lede">Sign in to collect the details a squad needs before they ask you in.</p>
        <Button tone="signal" type="button" onClick={openSignIn}>
          Sign in
        </Button>
      </section>
    )
  }

  if (!form) return <p className="form-alert" role="alert">{saveError || 'The card could not be loaded.'}</p>

  const preview = currentInput()
  const previewProfile = preview ? { id: user.id, ...preview, skills: preview.skills.length ? preview.skills : ['Skill'] } : null

  return (
    <section className="panel profile-layout">
      <form onSubmit={(event) => void onSubmit(event)}>
        <p className="kicker">Your card</p>
        <h1>Why a team should ask you in</h1>
        <Field id="display-name" label="Name" error={errors.displayName}>
          <input id="display-name" value={form.displayName} onChange={(event) => patch({ displayName: event.target.value })} />
        </Field>
        <Field id="role" label="Role" error={errors.role} hint="Frontend, backend, design, ML.">
          <input id="role" value={form.role} onChange={(event) => patch({ role: event.target.value })} />
        </Field>
        <Field id="skills" label="Skills" error={errors.skills} hint="Comma separated.">
          <input id="skills" value={skillText} onChange={(event) => setSkillText(event.target.value)} />
        </Field>
        <Field id="event" label="Event" error={errors.event}>
          <input id="event" value={form.event} onChange={(event) => patch({ event: event.target.value })} />
        </Field>
        <Field id="timezone" label="Timezone" error={errors.timezone}>
          <select id="timezone" value={form.timezone} onChange={(event) => patch({ timezone: event.target.value })}>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </Field>
        <Field id="availability" label="Availability" error={errors.availability}>
          <select
            id="availability"
            value={form.availability}
            onChange={(event) => patch({ availability: event.target.value as ProfileInput['availability'] })}
          >
            {availabilityValues.map((value) => (
              <option key={value} value={value}>
                {availabilityLabel[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="intent" label="Intent" error={errors.intent}>
          <select
            id="intent"
            value={form.intent}
            onChange={(event) => patch({ intent: event.target.value as ProfileInput['intent'] })}
          >
            {intentValues.map((value) => (
              <option key={value} value={value}>
                {intentLabel[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="github" label="GitHub" error={errors.github} hint="Optional. https://github.com/you">
          <input id="github" value={form.github} onChange={(event) => patch({ github: event.target.value })} />
        </Field>
        <Field id="discord" label="Discord" error={errors.discord} hint="Optional handle.">
          <input id="discord" value={form.discord} onChange={(event) => patch({ discord: event.target.value })} />
        </Field>
        <Field id="bio" label="Invite line" error={errors.bio} hint="The reason a squad should ask you to join.">
          <textarea id="bio" rows={4} value={form.bio} onChange={(event) => patch({ bio: event.target.value })} />
        </Field>
        <Toggle checked={form.open} onChange={(open) => patch({ open })} label={form.open ? 'On the board' : 'Hidden from search'} />
        {saveError ? <p className="form-alert" role="alert">{saveError}</p> : null}
        {notice ? <p className="quiet" role="status">{notice}</p> : null}
        <div className="form-actions">
          <Button tone="ink" type="button" busy={drafting} onClick={() => void draftInvite()}>
            {drafting ? 'Drafting' : 'Draft my invite line'}
          </Button>
          <Button tone="signal" type="submit" busy={busy}>
            {busy ? 'Saving' : 'Save card'}
          </Button>
        </div>
        <p className="quiet">
          Hosting a squad? <Link to="/teams/new">Open one</Link>.
        </p>
      </form>
      <aside>
        <p className="kicker">Preview</p>
        {previewProfile ? <ProfileCard profile={previewProfile} /> : null}
      </aside>
    </section>
  )
}
