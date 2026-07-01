import { BrandLockup } from './Brand.jsx'
import { getDisplayName, getInitials } from '../helpers.js'

export default function Header({ route, isAuthenticated, session, onLogout }) {
  const displayName = getDisplayName(session)
  const initials = getInitials(displayName || session?.email)
  const avatarUrl = session?.image

  return (
    <header className="site-header">
      <BrandLockup />
      <nav className="site-nav" aria-label="Main navigation">
        {!isAuthenticated && (
          <>
            <a className={route === 'marketing' ? 'active' : ''} href="#/">Marketing</a>
            <a className={route === 'login' ? 'active' : ''} href="#/login">Login</a>
            <a className="nav-button" href="#/register">Register</a>
          </>
        )}
        {isAuthenticated && (
          <>
            {session?.isAdmin ? (
              <a className={route === 'admin' ? 'active' : ''} href="#/admin">Admin</a>
            ) : (
              <>
                <a className={route === 'app' ? 'active' : ''} href="#/app">Dashboard</a>
                <a className={route === 'recognizer' ? 'active' : ''} href="#/recognizer">Translate</a>
                <a className={route === 'trainer' ? 'active' : ''} href="#/trainer">Trainer</a>
                <a className={route === 'library' ? 'active' : ''} href="#/library">Library</a>
              </>
            )}
            <a
              className={route === 'profile' ? 'header-avatar active' : 'header-avatar'}
              href="#/profile"
              aria-label={`${displayName} profile`}
              title={`${displayName} profile`}
            >
              {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials}</span>}
            </a>
            <button type="button" className="app-logout" onClick={onLogout}>Logout</button>
          </>
        )}
      </nav>
    </header>
  )
}
