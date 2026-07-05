/**
 * StatsPanel.jsx — Right sidebar widget for XP, streak, hearts, and league.
 */

import { getXP, getStreak, getHearts, getLeaderboardPosition, MAX_HEARTS, DAILY_GOAL } from '../../data/learnStore.js'

export default function StatsPanel() {
  const xp = getXP()
  const streak = getStreak()
  const hearts = getHearts()
  const league = getLeaderboardPosition()

  return (
    <aside className="learn-stats-panel">
      {/* Streak */}
      <div className="stats-card streak-card">
        <div className="stats-icon-row">
          <span className={`streak-flame ${streak > 0 ? 'active' : ''}`}>🔥</span>
          <div>
            <strong className="stats-value">{streak}</strong>
            <span className="stats-label">Day streak</span>
          </div>
        </div>
      </div>

      {/* Hearts */}
      <div className="stats-card hearts-card">
        <div className="stats-icon-row">
          <span className="hearts-icon">❤️</span>
          <div>
            <strong className="stats-value">{hearts}/{MAX_HEARTS}</strong>
            <span className="stats-label">Hearts</span>
          </div>
        </div>
        <div className="hearts-display">
          {Array.from({ length: MAX_HEARTS }).map((_, i) => (
            <span key={i} className={`heart ${i < hearts ? 'full' : 'empty'}`}>
              {i < hearts ? '❤️' : '🩶'}
            </span>
          ))}
        </div>
      </div>

      {/* Daily Goal */}
      <div className="stats-card goal-card">
        <div className="stats-icon-row">
          <span className="goal-icon">⚡</span>
          <div>
            <strong className="stats-value">{xp.today}/{DAILY_GOAL} XP</strong>
            <span className="stats-label">Daily goal</span>
          </div>
        </div>
        <div className="goal-bar">
          <div className="goal-bar-fill" style={{ width: `${xp.dailyProgress}%` }} />
        </div>
      </div>

      {/* League */}
      <div className="stats-card league-card">
        <div className="stats-icon-row">
          <span className="league-icon">🏆</span>
          <div>
            <strong className="stats-value">{league.league}</strong>
            <span className="stats-label">Rank #{league.rank}</span>
          </div>
        </div>
      </div>

      {/* Total XP */}
      <div className="stats-card xp-total-card">
        <div className="stats-icon-row">
          <span className="xp-icon">✨</span>
          <div>
            <strong className="stats-value">{xp.total} XP</strong>
            <span className="stats-label">Total earned</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
