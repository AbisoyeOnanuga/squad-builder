import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import * as desk from '../lib/desk'
import { errorMessage } from '../lib/errors'
import type { JoinRequest, Team } from '../lib/profile'
import { Button, Field, Loader } from '../ui/desk'

export function TeamPage() {
  const { teamId = '' } = useParams()
  const { user, ready, openSignIn } = useAuth()
  const [team, setTeam] = useState<Team | null>(null)
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!ready || !teamId) return
    let cancelled = false
    Promise.all([desk.getTeam(teamId), user ? desk.listRequests(teamId) : Promise.resolve([])])
      .then(([nextTeam, nextRequests]) => {
        if (cancelled) return
        if (!nextTeam) {
          setStatus('missing')
          return
        }
        setTeam(nextTeam)
        setRequests(nextRequests)
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(errorMessage(error))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [ready, teamId, user])

  const accepted = requests.filter((request) => request.status === 'accepted').length
  const full = team ? accepted >= team.seats : false
  const mine = requests.find((request) => request.requesterId === user?.id)
  const isOwner = Boolean(user && team && user.id === team.ownerId)

  async function requestSeat(event: FormEvent) {
    event.preventDefault()
    if (!user || !team) return
    setBusy(true)
    setNotice('')
    try {
      const created = await desk.createJoinRequest({ team, requester: user, message })
      setRequests((current) => [...current, created])
      setMessage('')
      setNotice('Request sent. The host can accept or decline it.')
    } catch (error) {
      setNotice(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function decide(requestId: string, next: 'accepted' | 'declined') {
    setBusy(true)
    setNotice('')
    try {
      const updated = await desk.updateRequestStatus(requestId, next)
      setRequests((current) => current.map((request) => (request.id === updated.id ? updated : request)))
    } catch (error) {
      setNotice(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') return <Loader label="Loading the squad" />
  if (status === 'missing') {
    return (
      <section className="panel narrow">
        <h1>That squad is not on the desk</h1>
        <Link to="/">Back to the board</Link>
      </section>
    )
  }
  if (status === 'error' || !team) return <p className="form-alert" role="alert">{loadError}</p>

  return (
    <section className="panel narrow">
      <p className="kicker">{team.event}</p>
      <h1>{team.name}</h1>
      <p className="lede">{team.pitch}</p>
      <p className="quiet">
        Hosted by {team.ownerName}. {accepted} of {team.seats} seats filled. Still looking for {team.neededRoles.join(', ')}.
      </p>
      <ul className="stamps">
        {team.neededRoles.map((role) => (
          <li key={role}>{role}</li>
        ))}
      </ul>

      {isOwner ? (
        <div className="request-list">
          <h2>Requests</h2>
          {requests.length === 0 ? <p className="quiet">No one has asked for a seat yet.</p> : null}
          <ul>
            {requests.map((request) => (
              <li key={request.id}>
                <div>
                  <strong>{request.requesterName}</strong>
                  <span>{request.status}</span>
                  {request.message ? <p>{request.message}</p> : null}
                </div>
                {request.status === 'pending' ? (
                  <div className="form-actions">
                    <Button tone="signal" type="button" busy={busy} disabled={full} onClick={() => void decide(request.id, 'accepted')}>
                      Accept
                    </Button>
                    <Button tone="ink" type="button" busy={busy} onClick={() => void decide(request.id, 'declined')}>
                      Decline
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {full ? <p className="quiet">This squad is full.</p> : null}
        </div>
      ) : null}

      {!isOwner && mine ? <p className="quiet" role="status">Your request is {mine.status}.</p> : null}

      {!isOwner && !mine ? (
        user ? (
          full ? (
            <p className="quiet">This squad is full.</p>
          ) : (
            <form onSubmit={(event) => void requestSeat(event)}>
              <Field id="join-message" label="Why you" hint="Optional. One or two sentences.">
                <textarea id="join-message" rows={4} value={message} onChange={(event) => setMessage(event.target.value)} />
              </Field>
              <Button tone="signal" type="submit" busy={busy}>
                {busy ? 'Sending' : 'Request a seat'}
              </Button>
            </form>
          )
        ) : (
          <Button tone="signal" type="button" onClick={openSignIn}>
            Sign in to request a seat
          </Button>
        )
      ) : null}

      {notice ? <p className="quiet" role="status">{notice}</p> : null}
      <p className="quiet">
        <Link to="/#squads">All squads</Link>
      </p>
    </section>
  )
}
