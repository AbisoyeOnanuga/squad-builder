import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button } from '../ui/desk'

export function SiteHeader() {
  const { user, ready, openSignIn, logout } = useAuth()

  return (
    <header className="site-header">
      <a className="skip" href="#board">
        Skip to the board
      </a>
      <Link to="/" className="wordmark">
        <span className="wordmark-tiles" aria-hidden="true">
          <span>S</span>
          <span>Q</span>
        </span>
        <span>Squad desk</span>
      </Link>
      <nav aria-label="Desk">
        <NavLink to="/" end>
          Board
        </NavLink>
        <NavLink to="/profile">Your card</NavLink>
        <NavLink to="/teams/new">Open a squad</NavLink>
      </nav>
      <div className="header-account">
        {ready && user ? (
          <>
            <span className="who">{user.name || user.email}</span>
            <Button tone="ink" type="button" onClick={() => void logout()}>
              Sign out
            </Button>
          </>
        ) : (
          <Button tone="signal" type="button" onClick={openSignIn}>
            Sign in
          </Button>
        )}
      </div>
    </header>
  )
}
