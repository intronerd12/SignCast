import AsyncStorage from '@react-native-async-storage/async-storage'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1'
const SESSION_KEY = 'signcastAuth'

const parseErrorMessage = async (response) => {
  let payload = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (payload?.message) return payload.message
  if (payload?.error) return payload.error
  return 'Request failed. Please try again.'
}

const saveSession = async (session, rememberMe = true) => {
  if (!rememberMe) return
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export const getSavedSession = async () => {
  const raw = await AsyncStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY)
    return null
  }
}

export const clearSession = async () => {
  await AsyncStorage.removeItem(SESSION_KEY)
}

export const loginUser = async ({ email, password, accessType, rememberMe = true }) => {
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
    email: payload.user,
    accessType,
  }

  await saveSession(session, rememberMe)
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
