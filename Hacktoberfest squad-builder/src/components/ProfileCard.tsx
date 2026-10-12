import { Link } from 'react-router-dom'
import { availabilityLabel, intentLabel, type Profile, type Team } from '../lib/profile'
import { Card, SplitFlap } from '../ui/desk'

export function ProfileCard({ profile, team }: { profile: Profile; team?: Team }) {
  return (
    <Card className="profile-card">
      <header>
        <SplitFlap text={profile.role} size="sm" />
        <p className={`intent-ticket intent-${profile.intent}`}>{intentLabel[profile.intent]}</p>
      </header>
      <h3>{profile.displayName}</h3>
      <p className="bio">{profile.bio || 'No invite line yet.'}</p>
      <ul className="stamps">
        {profile.skills.map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
      <footer>
        <span>
          {availabilityLabel[profile.availability]} · {profile.timezone}
        </span>
        {team ? <Link to={`/teams/${team.id}`}>Open seats</Link> : <span>{profile.event}</span>}
      </footer>
    </Card>
  )
}
