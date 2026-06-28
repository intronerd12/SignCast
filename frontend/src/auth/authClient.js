import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth, googleProvider } from './firebase'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const SESSION_KEY = 'signcastAuth'

const parseErrorMessage = async (response) => {
  let payload
  try {
    payload = await response.json()
  } catch {
    return 'Request failed. Please try again.'
  }
  if (payload?.message) return payload.message
  if (payload?.error) return payload.error
  return 'Request failed. Please try again.'
}

const saveSession = (session, rememberMe = true) => {
  const target = rememberMe ? window.localStorage : window.sessionStorage
  const other = rememberMe ? window.sessionStorage : window.localStorage

  other.removeItem(SESSION_KEY)
  target.setItem(SESSION_KEY, JSON.stringify(session))
}

export const getSavedSession = () => {
  const localSession = window.localStorage.getItem(SESSION_KEY)
  const temporarySession = window.sessionStorage.getItem(SESSION_KEY)
  const raw = localSession || temporarySession

  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    window.localStorage.removeItem(SESSION_KEY)
    window.sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

export const clearSession = () => {
  window.localStorage.removeItem(SESSION_KEY)
  window.sessionStorage.removeItem(SESSION_KEY)
}

export const updateSavedSession = (updates) => {
  const currentSession = getSavedSession()
  if (!currentSession) return null

  const nextSession = {
    ...currentSession,
    ...updates,
  }

  const isRemembered = Boolean(window.localStorage.getItem(SESSION_KEY))
  const target = isRemembered ? window.localStorage : window.sessionStorage
  target.setItem(SESSION_KEY, JSON.stringify(nextSession))

  return nextSession
}

export const loginUser = async ({ email, password, accessType, rememberMe }) => {
  const response = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const message = await parseErrorMessage(response)
    throw new Error(message || 'Unable to login. Please check your account.')
  }

  const payload = await response.json()

  if (accessType === 'admin' && !payload.isAdmin) {
    throw new Error('This account is not assigned as an admin account.')
  }

  const session = {
    token: payload.token,
    userId: payload.userId,
    isAdmin: Boolean(payload.isAdmin),
    isActive: payload.isActive !== false,
    email: payload.user,
    name: payload.name || '',
    phone: payload.phone || '',
    image: payload.image || '',
    createdAt: payload.createdAt || '',
    accessType,
  }

  saveSession(session, rememberMe)
  return session
}

export const registerUser = async ({ name, email, phone, password }) => {
  const response = await fetch(`${API_BASE}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      phone,
      password,
      isAdmin: false,
    }),
  })

  if (!response.ok) {
    const message = await parseErrorMessage(response)
    throw new Error(message || 'Unable to create account.')
  }

  return response.json()
}

export const loginWithGoogle = async ({ accessType = 'user', rememberMe = true } = {}) => {
  // Step 1 — Firebase popup sign-in with Google
  const result = await signInWithPopup(auth, googleProvider)
  const firebaseUser = result.user

  // Get the Google access token from the credential
  const credential = GoogleAuthProvider.credentialFromResult(result)
  const googleAccessToken = credential?.accessToken

  if (!googleAccessToken) {
    throw new Error('Unable to retrieve Google access token. Please try again.')
  }

  // Step 2 — Send the token to the backend so it can find / create the Supabase user
  const response = await fetch(`${API_BASE}/users/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: googleAccessToken }),
  })

  if (!response.ok) {
    const message = await parseErrorMessage(response)
    throw new Error(message || 'Google login failed on the server.')
  }

  const payload = await response.json()

  if (accessType === 'admin' && !payload.isAdmin) {
    throw new Error('This Google account is not assigned as an admin account.')
  }

  // Step 3 — Build and persist the local session
  const session = {
    token: payload.token || firebaseUser.accessToken || '',
    userId: payload.id || firebaseUser.uid,
    isAdmin: Boolean(payload.isAdmin),
    isActive: payload.isActive !== false,
    email: payload.email || firebaseUser.email,
    name: payload.name || firebaseUser.displayName || '',
    phone: payload.phone || '',
    image: payload.image || firebaseUser.photoURL || '',
    createdAt: payload.createdAt || '',
    accessType,
    provider: 'google',
  }

  saveSession(session, rememberMe)
  return session
}
