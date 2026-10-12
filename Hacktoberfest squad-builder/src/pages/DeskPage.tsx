import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { ProfileCard } from '../components/ProfileCard'
import * as desk from '../lib/desk'
import { errorMessage } from '../lib/errors'
import {
  availabilityLabel,
  availabilityValues,
  emptyFilters,
  intentLabel,
  intentValues,
  matchesFilters,
  scoreMatches,
  type BoardFilters,
  type Profile,
  type Team,
} from '../lib/profile'
import { Button, Loader, SplitFlap } from '../ui/desk'

export function DeskPage() {
  const { user, ready, openSignIn } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [mine, setMine] = useState<Profile | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [filters, setFilters] = useState<BoardFilters>(emptyFilters)
  const [whys, setWhys] = useState<Record<string, string>>({})
  const [agentNote, setAgentNote] = useState('')
  const [sharpening, setSharpening] = useState(false)

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    setStatus('loading')
    const profilePromise = user ? desk.getProfile(user.id) : Promise.resolve(null)
    Promise.all([desk.listProfiles(), desk.listTeams(), profilePromise])
      .then(([nextProfiles, nextTeams, nextMine]) => {
        if (cancelled) return
        setProfiles(nextProfiles)
        setTeams(nextTeams)
        setMine(nextMine)
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
  }, [ready, user])

  const visible = useMemo(() => profiles.filter((profile) => matchesFilters(profile, filters)), [filters, profiles])
  const suggestions = mine ? scoreMatches(mine, profiles) : []
  const teamByOwner = useMemo(() => {
    const map = new Map<string, Team>()
    for (const team of teams) map.set(team.ownerId, team)
    return map
  }, [teams])
  const roles = useMemo(() => {
    const unique = new Set(profiles.map((profile) => profile.role))
    return [...unique].sort((a, b) => a.localeCompare(b))
  }, [profiles])

  function patchFilters(patch: Partial<BoardFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
  }

  async function sharpen() {
    setSharpening(true)
    setAgentNote('')
    const result = await desk.explainMatches()
    setWhys(result.whys)
    setAgentNote(result.notice ?? 'Reasons updated by the squad agent.')
    setSharpening(false)
  }

  return (
    <>
      <section className="hero">
        <p className="kicker">Hackathon night desk</p>
        <h1>
          <span className="sr-only">Find a squad</span>
          <SplitFlap text="FIND A SQUAD" />
        </h1>
        <p className="lede">
          Put a card on the board with the hours you can give and the reason a team should ask you in. Search the open
          cards, then take a seat.
        </p>
        <div className="hero-actions">
          {user ? (
            <Link className="desk-btn tone-signal" to="/profile">
              Edit your card
            </Link>
          ) : (
            <Button tone="signal" type="button" onClick={openSignIn}>
              Create your card
            </Button>
          )}
          <a className="desk-btn tone-paper" href="#board">
            Read the board
          </a>
        </div>
      </section>

      <section id="board" className="panel">
        <div className="panel-head">
          <h2>Open cards</h2>
          <p>{status === 'ready' ? `${visible.length} on the desk` : 'Checking the board'}</p>
        </div>
        <form className="filters" onSubmit={(event) => event.preventDefault()}>
          <label>
            <span>Search</span>
            <input
              value={filters.query}
              onChange={(event) => patchFilters({ query: event.target.value })}
              placeholder="Skill, name, or invite line"
            />
          </label>
          <label>
            <span>Role</span>
            <select value={filters.role} onChange={(event) => patchFilters({ role: event.target.value })}>
              <option value="">Any role</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Event</span>
            <input
              value={filters.event}
              onChange={(event) => patchFilters({ event: event.target.value })}
              placeholder="Hacktoberfest"
            />
          </label>
          <label>
            <span>Availability</span>
            <select
              value={filters.availability}
              onChange={(event) => patchFilters({ availability: event.target.value })}
            >
              <option value="">Any hours</option>
              {availabilityValues.map((value) => (
                <option key={value} value={value}>
                  {availabilityLabel[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Intent</span>
            <select value={filters.intent} onChange={(event) => patchFilters({ intent: event.target.value })}>
              <option value="">Anyone</option>
              {intentValues.map((value) => (
                <option key={value} value={value}>
                  {intentLabel[value]}
                </option>
              ))}
            </select>
          </label>
        </form>

        {status === 'loading' ? <Loader /> : null}
        {status === 'error' ? <p className="form-alert" role="alert">{loadError}</p> : null}
        {status === 'ready' && visible.length === 0 ? (
          <div className="empty-board">
            <SplitFlap text={profiles.length === 0 ? 'OPEN' : 'NONE'} size="sm" />
            <p>
              {profiles.length === 0
                ? 'The board is clear. Be the first card on the desk.'
                : 'Nothing on the board matches that search.'}
            </p>
          </div>
        ) : null}
        {status === 'ready' && visible.length > 0 ? (
          <div className="board-grid">
            {visible.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} team={teamByOwner.get(profile.id)} />
            ))}
          </div>
        ) : null}
      </section>

      <section id="suggestions" className="panel">
        <div className="panel-head">
          <h2>Suggested squads</h2>
          <p>Same event, complementary skills, overlapping hours.</p>
        </div>
        {!user ? (
          <p className="quiet">
            <button type="button" className="text-button" onClick={openSignIn}>
              Sign in
            </button>{' '}
            and save a card to see who fits.
          </p>
        ) : null}
        {user && !mine ? (
          <p className="quiet">
            <Link to="/profile">Put your card on the board</Link> before the desk can suggest anyone.
          </p>
        ) : null}
        {mine && suggestions.length === 0 ? <p className="quiet">No open cards share your event yet.</p> : null}
        {mine && suggestions.length > 0 ? (
          <>
            <ul className="suggestion-list">
              {suggestions.map((match) => (
                <li key={match.profile.id}>
                  <div>
                    <strong>{match.profile.displayName}</strong>
                    <span>
                      {match.profile.role} · {intentLabel[match.profile.intent]}
                    </span>
                    <p>{whys[match.profile.id] ?? match.reason}</p>
                  </div>
                  {teamByOwner.get(match.profile.id) ? (
                    <Link className="desk-btn tone-paper" to={`/teams/${teamByOwner.get(match.profile.id)?.id}`}>
                      Request a seat
                    </Link>
                  ) : (
                    <span className="quiet">No squad posted yet</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="form-actions">
              <Button tone="ink" type="button" busy={sharpening} onClick={() => void sharpen()}>
                {sharpening ? 'Asking the desk' : 'Sharpen these reasons'}
              </Button>
            </div>
            {agentNote ? <p className="quiet" role="status">{agentNote}</p> : null}
          </>
        ) : null}
      </section>

      <section id="squads" className="panel">
        <div className="panel-head">
          <h2>Squads with open seats</h2>
          <Link to="/teams/new">Open a squad</Link>
        </div>
        {status === 'ready' && teams.length === 0 ? <p className="quiet">No squads posted yet.</p> : null}
        <div className="board-grid">
          {teams.map((team) => (
            <article key={team.id} className="desk-card squad-card">
              <p className="kicker">{team.event}</p>
              <h3>{team.name}</h3>
              <p className="bio">{team.pitch}</p>
              <ul className="stamps">
                {team.neededRoles.map((role) => (
                  <li key={role}>{role}</li>
                ))}
              </ul>
              <footer>
                <span>
                  {team.seats} seats · {team.ownerName}
                </span>
                <Link to={`/teams/${team.id}`}>View squad</Link>
              </footer>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
