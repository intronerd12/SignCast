import { useState } from 'react'
import { BrandLockup, VectorGesturePreview } from '../components/Brand.jsx'
import { loginUser } from '../auth/authClient'

function LoginPage({ onLoggedIn }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    accessType: 'user',
    remember: true,
  })
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isLoading, setIsLoading] = useState(false)

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
        accessType: form.accessType,
        rememberMe: form.remember,
      })

      setStatus({
        type: 'success',
        message: session.isAdmin
          ? 'Admin login successful. Redirecting to admin dashboard.'
          : 'Login successful. Redirecting to home page.',
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

  return (
    <section className="auth-layout">
      <aside className="auth-visual">
        <BrandLockup />
        <div>
          <p className="eyebrow">Secure access</p>
          <h1>Login to SignCast</h1>
          <p>
            Users can enter the FSL recognition app, while admins can access the web management area once connected.
          </p>
        </div>
        <VectorGesturePreview />
      </aside>

      <div className="auth-card">
        <div className="auth-heading">
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to your account</h2>
          <p>Choose the correct access type before logging in.</p>
        </div>

        <form className="auth-form" onSubmit={submitLogin}>
          <div className="segment-control" aria-label="Access type">
            <label className={form.accessType === 'user' ? 'selected' : ''}>
              <input type="radio" name="accessType" value="user" checked={form.accessType === 'user'} onChange={updateField} />
              User app
            </label>
            <label className={form.accessType === 'admin' ? 'selected' : ''}>
              <input type="radio" name="accessType" value="admin" checked={form.accessType === 'admin'} onChange={updateField} />
              Admin web
            </label>
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

          <button className="submit-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>

          <p className={`form-message ${status.type}`} aria-live="polite">{status.message}</p>
        </form>

        <p className="auth-switch">No account yet? <a href="#/register">Create an account</a></p>
      </div>
    </section>
  )
}

export default LoginPage
