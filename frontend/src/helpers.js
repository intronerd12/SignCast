export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
const THEME_KEY_PREFIX = 'signcastTheme'

export const normalizeConfidence = (value, fallback = 80) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.min(100, Math.round(parsed)))
}

export const normalizeLibraryEntry = (sample) => ({
  phrase: (sample?.phrase || '').toString().trim() || 'Unknown sign',
  confidence: normalizeConfidence(sample?.confidence, 80),
  motion: (sample?.motion || '').toString().trim(),
  gloss: (sample?.gloss || '').toString().trim(),
  source: (sample?.source || '').toString().trim() || 'prototype-rule-engine',
})

export const getDisplayName = (session, profile = null) => {
  const name = profile?.name || session?.name
  if (name) return name
  const localPart = session?.email?.split('@')?.[0]
  if (!localPart) return 'SignCast User'
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'SignCast User'
}

export const getInitials = (nameOrEmail = 'SignCast User') => {
  const words = nameOrEmail
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)

  return (words.length > 1
    ? `${words[0][0]}${words[1][0]}`
    : words[0]?.slice(0, 2) || 'SC'
  ).toUpperCase()
}

export const getRoute = () => {
  const route = window.location.hash.replace('#/', '').trim()
  return route || 'marketing'
}

export const normalizeThemePreference = (value) => {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'dark' || normalized === 'light' || normalized === 'system') {
    return normalized
  }
  return 'light'
}

const getThemeStorageKey = (session) => {
  const userKey = session?.userId || session?.email
  if (!userKey) return null
  return `${THEME_KEY_PREFIX}:${userKey}`
}

export const getStoredThemePreference = (session) => {
  const key = getThemeStorageKey(session)
  if (!key) return 'light'
  const stored = window.localStorage.getItem(key)
  return normalizeThemePreference(stored)
}

export const saveThemePreference = (session, value) => {
  const key = getThemeStorageKey(session)
  const normalized = normalizeThemePreference(value)
  if (!key) return normalized
  window.localStorage.setItem(key, normalized)
  return normalized
}

export const resolveTheme = (preference) => {
  const normalized = normalizeThemePreference(preference)
  if (normalized === 'dark' || normalized === 'light') return normalized

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
