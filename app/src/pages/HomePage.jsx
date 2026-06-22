import { getSavedSession } from '../auth/authClient'

function HomePage() {
  const session = getSavedSession()

  return (
    <section className="auth-layout">
      <aside className="auth-visual">
        <div>
          <p className="eyebrow">React app shell</p>
          <h1>SignCast App</h1>
          <p>
            The app pages now run through a React single page app. Use login or register to continue through
            the standardized auth flow.
          </p>
        </div>
      </aside>

      <div className="auth-card">
        <div className="auth-heading">
          <p className="eyebrow">Session status</p>
          <h2>{session ? 'You are signed in' : 'No active session'}</h2>
          <p>
            {session
              ? `Signed in as ${session.email || 'user'} with ${session.accessType} access.`
              : 'Sign in with an existing account or create a new user account.'}
          </p>
        </div>

        <div className="auth-form">
          <a className="submit-button" href="#/login">Go to login</a>
          <a className="submit-button" href="#/register">Go to register</a>
        </div>
      </div>
    </section>
  )
}

export default HomePage
