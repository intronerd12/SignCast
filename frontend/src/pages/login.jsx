import { useState } from 'react'
import { VectorGesturePreview } from '../components/Brand.jsx'
import { loginUser, loginWithGoogle } from '../auth/authClient'

function LoginPage({ onLoggedIn }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    remember: true,
  })
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const updateField = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const submitLogin = async (event) => {
    event.preventDefault()
    setStatus({ type: '', message: '' })
    setIsLoading(true)

    try {
      const session = await loginUser({
        email: form.email,
        password: form.password,
        accessType: 'user',
        rememberMe: form.remember,
      })

      setStatus({
        type: 'success',
        message: session.isAdmin
          ? 'Welcome back, admin. Redirecting…'
          : 'Login successful. Redirecting…',
      })

      window.setTimeout(() => {
        if (typeof onLoggedIn === 'function') {
          onLoggedIn(session)
          return
        }
        window.location.hash = session.isAdmin ? '#/admin' : '#/app'
      }, 800)
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setStatus({ type: '', message: '' })
    setIsGoogleLoading(true)

    try {
      const session = await loginWithGoogle({
        accessType: 'user',
        rememberMe: form.remember,
      })

      setStatus({
        type: 'success',
        message: session.isAdmin
          ? 'Welcome back, admin. Redirecting…'
          : 'Login successful. Redirecting…',
      })

      window.setTimeout(() => {
        if (typeof onLoggedIn === 'function') {
          onLoggedIn(session)
          return
        }
        window.location.hash = session.isAdmin ? '#/admin' : '#/app'
      }, 800)
    } catch (error) {
      if (error?.code === 'auth/popup-closed-by-user') {
        setIsGoogleLoading(false)
        return
      }
      setStatus({ type: 'error', message: error.message })
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <section className="auth-layout">
      <aside className="auth-visual">
        <div>
          <p className="eyebrow">Secure access</p>
          <h1>Welcome back to SignCast</h1>
          <p>
            Sign in to access the FSL recognition workspace, manage gestures, or enter the admin portal.
          </p>
        </div>
        <VectorGesturePreview />
      </aside>

      <div className="auth-card">
        <div className="auth-heading">
          <h2>Sign in</h2>
          <p>Enter your credentials to continue.</p>
        </div>

        <form className="auth-form" onSubmit={submitLogin}>
          <button
            type="button"
            className="google-button"
            disabled={isLoading || isGoogleLoading}
            onClick={handleGoogleLogin}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isGoogleLoading ? 'Connecting…' : 'Continue with Google'}
          </button>

          <div className="auth-divider">
            <span>or sign in with email</span>
          </div>

          <label className="field">
            <span>Email address</span>
            <input type="email" name="email" value={form.email} onChange={updateField} placeholder="name@example.com" autoComplete="email" required />
          </label>

          <label className="field">
            <span>Password</span>
            <input type="password" name="password" value={form.password} onChange={updateField} placeholder="Enter your password" autoComplete="current-password" required />
          </label>

          <div className="form-row">
            <label className="check-field">
              <input type="checkbox" name="remember" checked={form.remember} onChange={updateField} />
              Remember me
            </label>
            <a href="#/login">Forgot password?</a>
          </div>

          <button className="submit-button" type="submit" disabled={isLoading || isGoogleLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className={`form-message ${status.type}`} aria-live="polite">{status.message}</p>
        </form>

        <p className="auth-switch">No account yet? <a href="#/register">Create an account</a></p>
      </div>
    </section>
  )
}

export default LoginPage
