import { useState, useEffect } from 'react'
import { API_BASE, getDisplayName, getInitials } from '../helpers.js'
import { AdminBrandLogo, AdminNavIcon } from '../components/AdminIcons.jsx'

export default function AdminPage({ session, onLogout }) {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState([])
  const [adminStatus, setAdminStatus] = useState('Loading admin data...')
  const [actionStatus, setActionStatus] = useState({ type: '', message: '' })
  const [mutatingUserId, setMutatingUserId] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  
  // Real stats from backend
  const [stats, setStats] = useState({
    totalScores: 0,
    totalSamples: 0,
    verifiedSamples: 0,
    uniqueLabels: 0,
    scoresByType: [],
    dailyScores: [],
    topScorers: [],
    recentEvents: [],
    samplesByCategory: []
  })
  
  const [healthData, setHealthData] = useState({
    cloudServices: 'Checking...',
    uptime: 'Checking...',
  })

  // Basic info
  const [userCount, setUserCount] = useState(0)

  const adminName = getDisplayName(session)
  const adminInitials = getInitials(adminName || session?.email)
  const adminAvatar = session?.image

  const sidebarItems = [
    ['dashboard', 'dashboard', 'Dashboard'],
    ['users', 'users', 'User Accounts'],
    ['dictionary', 'dictionary', 'FSL Dictionary'],
    ['centers', 'centers', 'SPED Centers'],
    ['health', 'health', 'System Health'],
    ['audit', 'audit', 'Audit Logs'],
    ['api', 'api', 'API Settings'],
    ['reports', 'reports', 'Reports'],
  ]

  const loadAdminData = async () => {
    setIsSyncing(true)
    setAdminStatus('Syncing live data...')
    const startedAt = performance.now()

    try {
      const [countResponse, usersResponse, statsResponse, healthResponse] = await Promise.allSettled([
        fetch(`${API_BASE}/users/get/count`),
        fetch(`${API_BASE}/users`),
        fetch(`${API_BASE}/admin/stats`),
        fetch(`${API_BASE}/health`),
      ])

      // Parse user count
      if (countResponse.status === 'fulfilled' && countResponse.value.ok) {
        const countData = await countResponse.value.json()
        setUserCount(countData?.userCount || 0)
      }

      // Parse user list
      if (usersResponse.status === 'fulfilled' && usersResponse.value.ok) {
        const usersData = await usersResponse.value.json()
        setUsers(Array.isArray(usersData) ? usersData : [])
      }

      // Parse aggregated admin stats
      if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
        const statsData = await statsResponse.value.json()
        if (statsData?.success) {
          setStats(statsData)
        }
      }

      // Parse system health & uptime
      let currentCloudServices = 'Needs setup'
      let currentUptime = 'Offline'
      
      if (healthResponse.status === 'fulfilled' && healthResponse.value.ok) {
        const healthPayload = await healthResponse.value.json()
        
        if (healthPayload?.cloudinaryConfigured && healthPayload?.supabaseConfigured) {
          currentCloudServices = 'Cloudinary + Supabase Active'
        } else if (healthPayload?.cloudinaryConfigured) {
          currentCloudServices = 'Cloudinary Active'
        } else if (healthPayload?.supabaseConfigured) {
          currentCloudServices = 'Supabase Active'
        }

        if (healthPayload?.serverStartedAt) {
          // Calculate relative uptime
          const start = new Date(healthPayload.serverStartedAt)
          const diffMs = new Date() - start
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
          currentUptime = `${diffHours}h ${diffMins}m`
        } else if (healthPayload?.status === 'ok') {
          currentUptime = 'Online'
        }
      }
      
      const latencyMs = Math.max(1, Math.round(performance.now() - startedAt))
      setHealthData({
        cloudServices: currentCloudServices,
        uptime: currentUptime,
        latency: `${latencyMs}ms`
      })

      setLastSynced(new Date())
      setAdminStatus('Live system data synced')
    } catch (error) {
      setAdminStatus(error.message || 'Error fetching admin data')
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    loadAdminData()
    // Refresh data every 5 minutes automatically
    const interval = setInterval(loadAdminData, 300000)
    return () => clearInterval(interval)
  }, [])

  // Derived user filtering
  const filteredUsers = users.filter((user) => {
    const searchable = `${user.name || ''} ${user.email || ''} ${user.isAdmin ? 'admin' : 'user'} ${user.isActive === false ? 'inactive deactivated' : 'active'}`.toLowerCase()
    return searchable.includes(searchTerm.trim().toLowerCase())
  })

  // Format dates consistently
  const formatAdminDate = (value) => {
    if (!value) return '—'
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Admin Actions
  const parseAdminActionError = async (response) => {
    try {
      const payload = await response.json()
      return payload?.message || payload?.error || 'Admin action failed.'
    } catch {
      return 'Admin action failed.'
    }
  }

  const updateUserInState = (updatedUser) => {
    setUsers((current) => current.map((user) => (user.id === updatedUser.id ? { ...user, ...updatedUser } : user)))
  }

  const toggleUserStatus = async (user) => {
    if (!user?.id || user.id === session?.userId) return

    const nextActive = user.isActive === false
    setMutatingUserId(user.id)
    setActionStatus({ type: '', message: `${nextActive ? 'Activating' : 'Deactivating'} ${user.name || user.email}...` })

    try {
      const response = await fetch(`${API_BASE}/users/${user.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      })

      if (!response.ok) {
        throw new Error(await parseAdminActionError(response))
      }

      const payload = await response.json()
      updateUserInState(payload.user)
      setActionStatus({ type: 'success', message: payload.message || `User ${nextActive ? 'activated' : 'deactivated'}.` })
    } catch (error) {
      setActionStatus({ type: 'error', message: error.message || 'Unable to update user status.' })
    } finally {
      setMutatingUserId('')
    }
  }

  const deleteUser = async (user) => {
    if (!user?.id || user.id === session?.userId) return

    const label = user.name || user.email || 'this user'
    const confirmed = window.confirm(`Delete ${label}? This removes the account and all associated scores/samples.`)
    if (!confirmed) return

    setMutatingUserId(user.id)
    setActionStatus({ type: '', message: `Deleting ${label}...` })

    try {
      const response = await fetch(`${API_BASE}/users/${user.id}`, { method: 'DELETE' })

      if (!response.ok) {
        throw new Error(await parseAdminActionError(response))
      }

      setUsers((current) => current.filter((item) => item.id !== user.id))
      setUserCount(prev => Math.max(0, prev - 1))
      setActionStatus({ type: 'success', message: `${label} deleted.` })
    } catch (error) {
      setActionStatus({ type: 'error', message: error.message || 'Unable to delete user.' })
    } finally {
      setMutatingUserId('')
    }
  }

  // Dynamic status messages based on active section
  const getSectionSummary = () => {
    if (activeSection === 'users') return `${filteredUsers.length} accounts matching search`
    if (activeSection === 'dictionary') return `${stats.uniqueLabels} unique signs recorded`
    if (activeSection === 'health') return healthData.cloudServices
    if (activeSection === 'api') return `Average latency ${healthData.latency || '...'}`
    return adminStatus
  }

  // Prepare chart data dynamically
  // Pad with 0s if we have less than 12 days of data
  const chartValues = stats.dailyScores.map(d => d.avg)
  while (chartValues.length < 12) {
    chartValues.unshift(0) 
  }
  const maxChartValue = Math.max(1, ...chartValues) // prevent div by zero

  // Section Renders
  const renderDashboard = () => (
    <>
      <section className="admin-metrics">
        <article className="admin-stat-card">
          <span className="admin-stat-icon">👥</span>
          <p>Total users</p>
          <strong>{userCount.toLocaleString()}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon">🎯</span>
          <p>Tests Completed</p>
          <strong>{stats.totalScores.toLocaleString()}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon">✋</span>
          <p>FSL Samples DB</p>
          <strong>{stats.totalSamples.toLocaleString()}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon">⏱️</span>
          <p>System uptime</p>
          <strong>{healthData.uptime}</strong>
        </article>
      </section>

      <section className="admin-chart-card">
        <div className="admin-card-heading">
          <p className="eyebrow">Average Test Scores (Global)</p>
          <span>Past {stats.dailyScores.length} Active Days</span>
        </div>
        
        {stats.dailyScores.length === 0 ? (
          <div className="admin-empty-state">
            <p>No test scores recorded yet.</p>
          </div>
        ) : (
          <svg viewBox="0 0 520 260" role="img" aria-label="System translation accuracy chart">
            <defs>
              <linearGradient id="adminChartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1cb0f6" stopOpacity="0.62" />
                <stop offset="100%" stopColor="#1cb0f6" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((line) => (
              <line key={line} x1="34" x2="500" y1={50 + line * 48} y2={50 + line * 48} className="admin-chart-grid-line" />
            ))}
            <path
              className="admin-chart-area"
              style={{fill: 'url(#adminChartFill)'}}
              d={`M 34 ${220 - (chartValues[0] / maxChartValue) * 172} ${chartValues
                .map((value, index) => `L ${34 + index * 42.3} ${220 - (value / maxChartValue) * 172}`)
                .join(' ')} L 500 220 L 34 220 Z`}
            />
            <polyline
              className="admin-chart-line"
              style={{stroke: '#1cb0f6', filter: 'drop-shadow(0 7px 10px rgba(28, 176, 246, 0.28))'}}
              points={chartValues.map((value, index) => `${34 + index * 42.3},${220 - (value / maxChartValue) * 172}`).join(' ')}
            />
            {chartValues.map((value, index) => (
              <circle key={`${value}-${index}`} className="admin-chart-point" style={{fill: '#1cb0f6'}} cx={34 + index * 42.3} cy={220 - (value / maxChartValue) * 172} r="5" />
            ))}
          </svg>
        )}
      </section>

      <section className="admin-table-card">
        <div className="admin-card-heading">
          <p className="eyebrow">Recent User Registrations</p>
          <button className="admin-action-button neutral" onClick={() => setActiveSection('users')}>View All</button>
        </div>

        {users.length === 0 ? (
          <div className="admin-empty-state">
            <p>No user accounts found in database.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 5).map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name || 'Anonymous'}</strong>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>{user.email}</div>
                    </td>
                    <td>{user.isAdmin ? 'Admin' : 'Student'}</td>
                    <td>
                      <span className={user.isActive === false ? 'admin-status-badge inactive' : user.isAdmin ? 'admin-status-badge admin' : 'admin-status-badge'}>
                        {user.isActive === false ? 'Inactive' : user.isAdmin ? 'Privileged' : 'Active'}
                      </span>
                    </td>
                    <td>{formatAdminDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {renderConfigSidebar()}
    </>
  )

  const renderUsers = () => (
    <section className="admin-table-card full-width">
      <div className="admin-card-heading">
        <p className="eyebrow">User Management Directory</p>
        <span className={actionStatus.type ? `admin-action-message ${actionStatus.type}` : 'admin-action-message'}>
          {actionStatus.message || getSectionSummary()}
        </span>
      </div>

      {users.length === 0 ? (
        <div className="admin-empty-state">
          <p>No user accounts found in database.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>User Identity</th>
                <th>Role</th>
                <th>Status</th>
                <th>Registered At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isSelf = user.id === session?.userId
                const isBusy = mutatingUserId === user.id
                const isActive = user.isActive !== false

                return (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name || 'Anonymous'}</strong>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>{user.email}</div>
                    </td>
                    <td>{user.isAdmin ? 'Admin' : 'Student'}</td>
                    <td>
                      <span className={!isActive ? 'admin-status-badge inactive' : user.isAdmin ? 'admin-status-badge admin' : 'admin-status-badge'}>
                        {!isActive ? 'Inactive' : user.isAdmin ? 'Privileged' : 'Active'}
                      </span>
                    </td>
                    <td>{formatAdminDate(user.createdAt)}</td>
                    <td>
                      <div className="admin-action-group">
                        <button
                          type="button"
                          className={isActive ? 'admin-action-button neutral' : 'admin-action-button success'}
                          onClick={() => toggleUserStatus(user)}
                          disabled={isSelf || isBusy}
                          title={isSelf ? 'You cannot change your own admin status.' : isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {isBusy ? 'Working' : isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="admin-action-button danger"
                          onClick={() => deleteUser(user)}
                          disabled={isSelf || isBusy}
                          title={isSelf ? 'You cannot delete your own account.' : 'Delete user'}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="admin-empty-state" style={{padding: '20px', textAlign: 'center'}}>
              <p>No users match your search "{searchTerm}"</p>
            </div>
          )}
        </div>
      )}
    </section>
  )

  const renderDictionary = () => (
    <div className="admin-content-grid" style={{ gridTemplateColumns: '1fr', gridTemplateAreas: '"table"' }}>
      <section className="admin-table-card">
        <div className="admin-card-heading">
          <p className="eyebrow">FSL Sign Samples Database</p>
          <span>{stats.totalSamples} total samples verified</span>
        </div>

        {stats.samplesByCategory.length === 0 ? (
          <div className="admin-empty-state">
            <p>No FSL samples recorded in the database yet.</p>
          </div>
        ) : (
          <div className="dictionary-categories">
            {stats.samplesByCategory.map(cat => (
              <div key={cat.category} className="dictionary-category-block">
                <h3 style={{fontSize: '16px', marginBottom: '12px', textTransform: 'capitalize'}}>
                  {cat.category} <span style={{color: 'var(--muted)', fontWeight: 'normal', fontSize: '14px'}}>({cat.count} samples, {cat.uniqueLabels} unique signs)</span>
                </h3>
                <div className="admin-dictionary-list">
                  {cat.labels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                  {cat.uniqueLabels > 10 && (
                    <span className="more-labels">+{cat.uniqueLabels - 10} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )

  const renderReports = () => (
    <div className="admin-content-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateAreas: '"metrics metrics" "table config"' }}>
      <section className="admin-metrics" style={{gridArea: 'metrics'}}>
         {stats.scoresByType.map(stat => (
            <article key={stat.type} className="admin-stat-card">
              <span className="admin-stat-icon">📝</span>
              <p>{stat.type.replace('-', ' ')} Tests</p>
              <strong>{stat.count}</strong>
            </article>
         ))}
      </section>

      <section className="admin-table-card" style={{gridArea: 'table'}}>
        <div className="admin-card-heading">
          <p className="eyebrow">Top Scorers Leaderboard</p>
        </div>
        {stats.topScorers.length === 0 ? (
          <div className="admin-empty-state">
            <p>No scores recorded yet.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>User</th>
                  <th>Highest Score</th>
                  <th>Test Type</th>
                </tr>
              </thead>
              <tbody>
                {stats.topScorers.map((scorer, i) => (
                  <tr key={scorer.user_id}>
                    <td><strong style={{color: i===0 ? '#d97706' : 'inherit'}}>{i + 1}</strong></td>
                    <td>
                      <strong>{scorer.name || 'Anonymous'}</strong>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>{scorer.email}</div>
                    </td>
                    <td><strong>{scorer.score} pts</strong></td>
                    <td style={{textTransform: 'capitalize'}}>{scorer.test_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="admin-config-card" style={{gridArea: 'config'}}>
        <div className="admin-card-heading">
           <p className="eyebrow">Report Export Options</p>
        </div>
        <div className="admin-empty-state" style={{padding: '40px 20px', textAlign: 'center'}}>
           <p>CSV and PDF reporting functionality is coming soon.</p>
           <button className="admin-action-button neutral" style={{marginTop: '12px'}} disabled>Export CSV (Soon)</button>
        </div>
      </aside>
    </div>
  )

  const renderAuditLogs = () => (
    <section className="admin-table-card full-width">
      <div className="admin-card-heading">
        <p className="eyebrow">System Audit Logs</p>
        <span>Recent critical events</span>
      </div>

      {stats.recentEvents.length === 0 ? (
         <div className="admin-empty-state">
           <p>No audit events found. The system is operating normally.</p>
         </div>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Category</th>
                <th>Action</th>
                <th>Payload Reference</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentEvents.map(event => (
                <tr key={event.id}>
                  <td>{formatAdminDate(event.created_at)}</td>
                  <td><span className="admin-status-badge">{event.category}</span></td>
                  <td><strong>{event.action}</strong></td>
                  <td style={{fontFamily: 'monospace', fontSize: '12px', color: '#6b7280'}}>
                     {JSON.stringify(event.payload).substring(0, 40)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )

  const renderPlaceholder = (title) => (
    <section className="admin-table-card full-width">
      <div className="admin-card-heading">
        <p className="eyebrow">{title}</p>
      </div>
      <div className="admin-empty-state" style={{padding: '60px', textAlign: 'center'}}>
        <span style={{fontSize: '48px', display: 'block', marginBottom: '16px'}}>🚧</span>
        <h3>This module is under construction</h3>
        <p style={{color: 'var(--muted)', marginTop: '8px'}}>The {title.toLowerCase()} feature is planned for a future release.</p>
      </div>
    </section>
  )

  const renderConfigSidebar = () => (
    <aside className="admin-config-card">
      <div className="admin-card-heading">
        <p className="eyebrow">System configuration</p>
        <span style={{color: isSyncing ? '#1cb0f6' : '#10b981', display: 'flex', alignItems: 'center', gap: '4px'}}>
          <span style={{display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: isSyncing ? '#1cb0f6' : '#10b981'}} />
          {isSyncing ? 'Syncing...' : 'Live API'}
        </span>
      </div>
      <dl>
        <div>
          <dt>Data Last Synced</dt>
          <dd>{lastSynced ? formatAdminDate(lastSynced) : 'Never'}</dd>
        </div>
        <div>
          <dt>API Latency</dt>
          <dd>{healthData.latency || '...'}</dd>
        </div>
        <div>
          <dt>Cloud Services</dt>
          <dd style={{fontSize: '13px', maxWidth: '140px'}}>{healthData.cloudServices}</dd>
        </div>
        <div>
          <dt>Unique FSL Labels</dt>
          <dd>{stats.uniqueLabels.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Verified Samples</dt>
          <dd>{stats.verifiedSamples.toLocaleString()}</dd>
        </div>
      </dl>
      <button 
        className="admin-action-button neutral" 
        style={{width: '100%', marginTop: '20px', padding: '10px'}}
        onClick={loadAdminData}
        disabled={isSyncing}
      >
        {isSyncing ? 'Refreshing...' : 'Refresh Data Manually'}
      </button>
    </aside>
  )

  return (
    <section className="admin-portal">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <a className="admin-brand" href="#/admin">
          <span className="admin-brand-mark"><AdminBrandLogo /></span>
          <strong>SignCast</strong>
        </a>

        <nav className="admin-menu">
          {sidebarItems.map(([key, icon, label]) => (
            <button
              type="button"
              className={activeSection === key ? 'active' : ''}
              onClick={() => setActiveSection(key)}
              key={key}
            >
              <span><AdminNavIcon name={icon} /></span>
              {label}
            </button>
          ))}
          <button type="button" onClick={onLogout} style={{marginTop: 'auto', borderTop: '1px solid #dde5ea', paddingTop: '14px', borderRadius: 0}}>
            <span><AdminNavIcon name="logout" /></span>
            Logout
          </button>
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">SignCast Admin Portal</p>
            <h1>{activeSection === 'dashboard' ? 'Dashboard' : sidebarItems.find(([key]) => key === activeSection)?.[2]}</h1>
          </div>

          <label className="admin-search">
            <span>Search</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                if (activeSection !== 'users') setActiveSection('users')
              }}
              placeholder="Search users, roles, status..."
            />
          </label>

          <a className="admin-profile-pill" href="#/profile" aria-label={`${adminName} profile`}>
            <span className="admin-profile-avatar">
              {adminAvatar ? <img src={adminAvatar} alt="" /> : adminInitials}
            </span>
            <span>
              <strong>{adminName}</strong>
              <small>Admin</small>
            </span>
          </a>
        </header>

        <div className="admin-content-grid" style={activeSection !== 'dashboard' && activeSection !== 'reports' && activeSection !== 'dictionary' ? { gridTemplateColumns: '1fr', gridTemplateAreas: '"table"' } : {}}>
          {activeSection === 'dashboard' && renderDashboard()}
          {activeSection === 'users' && renderUsers()}
          {activeSection === 'dictionary' && renderDictionary()}
          {activeSection === 'reports' && renderReports()}
          {activeSection === 'audit' && renderAuditLogs()}
          {activeSection === 'centers' && renderPlaceholder('SPED Centers Module')}
          {activeSection === 'health' && renderPlaceholder('Advanced System Health')}
          {activeSection === 'api' && renderPlaceholder('API Configuration')}
        </div>

        <footer className="admin-footer">
          (c) 2026 SignCast | Admin Portal | Technological University of the Philippines - Taguig
        </footer>
      </div>
    </section>
  )
}
