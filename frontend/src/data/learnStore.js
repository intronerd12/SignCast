/**
 * learnStore.js — localStorage-backed progress engine
 *
 * Tracks XP, streaks, hearts, completed lessons, and per-unit progress.
 * All data persists across sessions via localStorage.
 */

const STORAGE_KEY = 'signcast_learn_progress'

const MAX_HEARTS = 5
const HEART_REGEN_MS = 30 * 60 * 1000 // 30 minutes per heart
const XP_PER_CORRECT = 10
const XP_PERFECT_BONUS = 20
const DAILY_GOAL = 50

// ── Defaults ───────────────────────────────────────────────────────────────

function defaultProgress() {
  return {
    xp: 0,
    xpToday: 0,
    todayDate: new Date().toDateString(),
    streak: 0,
    lastActiveDate: null,
    hearts: MAX_HEARTS,
    heartsLostAt: null,
    completedLessons: {},   // { unitId: { bestScore, attempts, completed } }
    unlockedUnits: ['greetings'],
  }
}

// ── Read / Write ───────────────────────────────────────────────────────────

export function getProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProgress()
    const data = JSON.parse(raw)

    // Reset daily XP if date changed
    if (data.todayDate !== new Date().toDateString()) {
      data.xpToday = 0
      data.todayDate = new Date().toDateString()
    }

    // Regenerate hearts over time
    if (data.hearts < MAX_HEARTS && data.heartsLostAt) {
      const elapsed = Date.now() - data.heartsLostAt
      const regen = Math.floor(elapsed / HEART_REGEN_MS)
      if (regen > 0) {
        data.hearts = Math.min(MAX_HEARTS, data.hearts + regen)
        if (data.hearts >= MAX_HEARTS) {
          data.heartsLostAt = null
        } else {
          data.heartsLostAt = data.heartsLostAt + regen * HEART_REGEN_MS
        }
      }
    }

    saveProgress(data)
    return data
  } catch {
    return defaultProgress()
  }
}

export function saveProgress(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // quota exceeded, silently fail
  }
}

// ── Hearts ─────────────────────────────────────────────────────────────────

export function loseHeart() {
  const progress = getProgress()
  if (progress.hearts > 0) {
    progress.hearts -= 1
    if (!progress.heartsLostAt) {
      progress.heartsLostAt = Date.now()
    }
    saveProgress(progress)
  }
  return progress.hearts
}

export function getHearts() {
  return getProgress().hearts
}

export function hasHeartsLeft() {
  return getProgress().hearts > 0
}

// ── Streak ─────────────────────────────────────────────────────────────────

function updateStreak(progress) {
  const today = new Date().toDateString()
  const lastActive = progress.lastActiveDate

  if (!lastActive) {
    // First ever activity
    progress.streak = 1
  } else if (lastActive === today) {
    // Already active today, no change
  } else {
    const lastDate = new Date(lastActive)
    const todayDate = new Date(today)
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      progress.streak += 1
    } else {
      progress.streak = 1  // Reset streak
    }
  }

  progress.lastActiveDate = today
  return progress
}

export function getStreak() {
  return getProgress().streak
}

// ── XP ─────────────────────────────────────────────────────────────────────

export function getXP() {
  const progress = getProgress()
  return {
    total: progress.xp,
    today: progress.xpToday,
    dailyGoal: DAILY_GOAL,
    dailyProgress: Math.min(100, Math.round((progress.xpToday / DAILY_GOAL) * 100)),
  }
}

// ── Lesson Completion ──────────────────────────────────────────────────────

const UNIT_ORDER = ['greetings', 'alphabet', 'common', 'family', 'feelings', 'questions']

/**
 * Mark a lesson as complete and award XP.
 * @param {string} unitId
 * @param {number} correctCount — how many the user got right
 * @param {number} totalCount — total questions
 * @returns {{ xpEarned, isPerfect, newUnlock }}
 */
export function completeLesson(unitId, correctCount, totalCount) {
  const progress = getProgress()

  // Calculate XP
  const isPerfect = correctCount === totalCount
  let xpEarned = correctCount * XP_PER_CORRECT
  if (isPerfect) xpEarned += XP_PERFECT_BONUS

  progress.xp += xpEarned
  progress.xpToday += xpEarned

  // Update streak
  updateStreak(progress)

  // Update lesson record
  const existing = progress.completedLessons[unitId] || {
    bestScore: 0,
    attempts: 0,
    completed: false,
  }

  existing.attempts += 1
  existing.bestScore = Math.max(existing.bestScore, correctCount)
  existing.completed = true
  progress.completedLessons[unitId] = existing

  // Unlock next unit
  let newUnlock = null
  const currentIndex = UNIT_ORDER.indexOf(unitId)
  if (currentIndex >= 0 && currentIndex < UNIT_ORDER.length - 1) {
    const nextUnitId = UNIT_ORDER[currentIndex + 1]
    if (!progress.unlockedUnits.includes(nextUnitId)) {
      progress.unlockedUnits.push(nextUnitId)
      newUnlock = nextUnitId
    }
  }

  // Refill hearts on completion
  progress.hearts = MAX_HEARTS
  progress.heartsLostAt = null

  saveProgress(progress)

  return { xpEarned, isPerfect, newUnlock }
}

// ── Unit Progress ──────────────────────────────────────────────────────────

export function isUnitUnlocked(unitId) {
  return getProgress().unlockedUnits.includes(unitId)
}

export function isUnitCompleted(unitId) {
  return getProgress().completedLessons[unitId]?.completed === true
}

export function getUnitProgress(unitId) {
  const lesson = getProgress().completedLessons[unitId]
  if (!lesson) return 0
  // Return best score as a percentage of 5 exercises
  return Math.min(100, Math.round((lesson.bestScore / 5) * 100))
}

// ── Leaderboard (simulated) ────────────────────────────────────────────────

export function getLeaderboardPosition() {
  const xp = getProgress().xp
  // Simple simulated rank based on XP
  if (xp >= 500) return { rank: 1, league: 'Diamond' }
  if (xp >= 300) return { rank: 3, league: 'Gold' }
  if (xp >= 150) return { rank: 7, league: 'Silver' }
  if (xp >= 50) return { rank: 15, league: 'Bronze' }
  return { rank: 30, league: 'Starter' }
}

// ── Constants Export ───────────────────────────────────────────────────────

export { MAX_HEARTS, DAILY_GOAL, XP_PER_CORRECT, XP_PERFECT_BONUS }
