import { useState, useEffect, useRef } from 'react'
import { API_BASE, getDisplayName, getInitials } from '../helpers.js'
import { AdminBrandLogo, AdminNavIcon } from '../components/AdminIcons.jsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function AdminPage({ session, onLogout }) {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState([])
  const [adminStatus, setAdminStatus] = useState('Loading admin data...')
  const [actionStatus, setActionStatus] = useState({ type: '', message: '' })
  const [mutatingUserId, setMutatingUserId] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  
  const [pendingSamples, setPendingSamples] = useState([])
  const [isTraining, setIsTraining] = useState(false)
  const [trainingLogs, setTrainingLogs] = useState('')
  
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

  const [spedCenters, setSpedCenters] = useState([])
  const [isSpedLoading, setIsSpedLoading] = useState(false)
  const [spedStatus, setSpedStatus] = useState('Load SPED centers from OpenStreetMap')
  const [spedError, setSpedError] = useState('')
  const [selectedSpedCenter, setSelectedSpedCenter] = useState(null)

  const spedMapRef = useRef(null)
  const spedMapInstanceRef = useRef(null)
  const spedMarkerLayerRef = useRef(null)
  const spedMarkerRefs = useRef(new Map())

  // Basic info
  const [userCount, setUserCount] = useState(0)

  const adminName = getDisplayName(session)
  const adminInitials = getInitials(adminName || session?.email)
  const adminAvatar = session?.image

  const sidebarItems = [
    ['dashboard', 'dashboard', 'Dashboard'],
    ['users', 'users', 'User Accounts'],
    ['dictionary', 'dictionary', 'FSL Dictionary'],
    ['training', 'training', 'Model Training'],
    ['centers', 'centers', 'SPED Centers'],
    ['audit', 'audit', 'Audit Logs'],
    ['reports', 'reports', 'Reports'],
  ]

  const loadAdminData = async () => {
    setIsSyncing(true)
    setAdminStatus('Syncing live data...')
    const startedAt = performance.now()

    try {
      const [countResponse, usersResponse, statsResponse, healthResponse, pendingResponse] = await Promise.allSettled([
        fetch(`${API_BASE}/users/get/count`),
        fetch(`${API_BASE}/users`),
        fetch(`${API_BASE}/admin/stats`),
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/admin/pending`),
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
          const ms = Date.now() - new Date(healthPayload.serverStartedAt).getTime()
          const mins = Math.floor(ms / 60000)
          const hrs = Math.floor(mins / 60)
          currentUptime = `${hrs}h ${mins % 60}m`
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

      // Parse pending samples
      if (pendingResponse?.status === 'fulfilled' && pendingResponse.value.ok) {
        const pendingData = await pendingResponse.value.json()
        if (pendingData?.success) {
          setPendingSamples(pendingData.pending || [])
        }
      }

      setLastSynced(new Date())
      setAdminStatus('Live system data synced')
    } catch (error) {
      setAdminStatus(error.message || 'Error fetching admin data')
    } finally {
      setIsSyncing(false)
    }
  }

  const verifySample = async (sample, approved) => {
    try {
      const res = await fetch(`${API_BASE}/admin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: sample.label, filename: sample.filename, approved })
      })
      const data = await res.json()
      if (data.success) {
        setPendingSamples(current => current.filter(s => s.filename !== sample.filename))
        setActionStatus({ type: 'success', message: `${sample.label} ${approved ? 'approved' : 'rejected'}.` })
      } else {
        throw new Error(data.message)
      }
    } catch (err) {
      setActionStatus({ type: 'error', message: err.message || 'Verification failed.' })
    }
  }

  const trainModel = async () => {
    setIsTraining(true)
    setTrainingLogs('Starting model training...\n')
    setActionStatus({ type: '', message: 'Training model...' })
    try {
      const res = await fetch(`${API_BASE}/admin/train`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setTrainingLogs(prev => prev + data.output)
        setActionStatus({ type: 'success', message: 'Model trained successfully!' })
      } else {
        throw new Error(data.error || data.message || 'Training failed.')
      }
    } catch (err) {
      setTrainingLogs(prev => prev + `\nError: ${err.message}`)
      setActionStatus({ type: 'error', message: 'Model training failed.' })
    } finally {
      setIsTraining(false)
    }
  }

  const normalizeSpedCenter = (item) => {
    const lat = Number.parseFloat(item?.lat)
    const lon = Number.parseFloat(item?.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

    const displayName = (item?.display_name || 'Unknown center').trim()
    const parts = displayName.split(',').map(part => part.trim()).filter(Boolean)

    return {
      id: item?.place_id || `${lat}-${lon}`,
      name: parts[0] || 'SPED Center',
      address: displayName,
      region: parts.slice(-2).join(', ') || 'Philippines',
      lat,
      lon,
      type: item?.type || item?.class || 'education',
    }
  }

  const loadSpedCenters = async () => {
    setIsSpedLoading(true)
    setSpedError('')
    setSpedStatus('Loading SPED centers from OpenStreetMap...')

    try {
      const queries = [
        'special education school philippines',
        'sped center philippines',
        'special needs school philippines',
      ]

      const results = await Promise.allSettled(
        queries.map((query) =>
          fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=ph&limit=25&q=${encodeURIComponent(query)}`
          )
        )
      )

      const merged = []
      for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value.ok) continue
        const payload = await result.value.json()
        if (Array.isArray(payload)) merged.push(...payload)
      }

      const dedupe = new Map()
      for (const item of merged) {
        const normalized = normalizeSpedCenter(item)
        if (!normalized) continue
        const key = `${normalized.name.toLowerCase()}|${normalized.lat.toFixed(4)}|${normalized.lon.toFixed(4)}`
        if (!dedupe.has(key)) dedupe.set(key, normalized)
      }

      const centers = Array.from(dedupe.values()).sort((a, b) => a.name.localeCompare(b.name))
      setSpedCenters(centers)

      if (centers.length > 0) {
        setSelectedSpedCenter(centers[0])
        setSpedStatus(`${centers.length} SPED-related centers found via OpenStreetMap API`)
      } else {
        setSpedStatus('No SPED centers found from OpenStreetMap API for this query.')
      }
    } catch (error) {
      setSpedError(error.message || 'Unable to load SPED centers map data.')
      setSpedStatus('Failed to load SPED centers')
    } finally {
      setIsSpedLoading(false)
    }
  }

  const focusSpedCenter = (center) => {
    if (!center) return
    setSelectedSpedCenter(center)

    const map = spedMapInstanceRef.current
    if (!map) return

    map.flyTo([center.lat, center.lon], 12, {
      animate: true,
      duration: 0.8,
    })

    const marker = spedMarkerRefs.current.get(center.id)
    if (marker) {
      marker.openPopup()
    }
  }

  useEffect(() => {
    loadAdminData()
    // Refresh data every 5 minutes automatically
    const interval = setInterval(loadAdminData, 300000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeSection !== 'centers' || spedCenters.length > 0 || isSpedLoading) return
    loadSpedCenters()
  }, [activeSection])

  useEffect(() => {
    if (activeSection !== 'centers' || !spedMapRef.current || spedMapInstanceRef.current) return

    const map = L.map(spedMapRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([12.8797, 121.774], 6)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    spedMapInstanceRef.current = map
    spedMarkerLayerRef.current = L.layerGroup().addTo(map)
  }, [activeSection])

  useEffect(() => {
    const map = spedMapInstanceRef.current
    const layer = spedMarkerLayerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    spedMarkerRefs.current.clear()
    const validCenters = spedCenters.filter(center => Number.isFinite(center.lat) && Number.isFinite(center.lon))

    validCenters.forEach((center) => {
      const marker = L.circleMarker([center.lat, center.lon], {
        radius: 7,
        color: '#1f7a58',
        weight: 2,
        fillColor: '#7de2b9',
        fillOpacity: 0.88,
      })

      marker.bindPopup(`<strong>${center.name}</strong><br/>${center.address}`)
      marker.on('click', () => setSelectedSpedCenter(center))
      layer.addLayer(marker)
      spedMarkerRefs.current.set(center.id, marker)
    })

    if (validCenters.length > 1) {
      const bounds = L.latLngBounds(validCenters.map(center => [center.lat, center.lon]))
      map.fitBounds(bounds, { padding: [26, 26] })
    } else if (validCenters.length === 1) {
      map.setView([validCenters[0].lat, validCenters[0].lon], 12)
    } else {
      map.setView([12.8797, 121.774], 6)
    }
  }, [spedCenters])

  useEffect(() => {
    return () => {
      if (spedMapInstanceRef.current) {
        spedMapInstanceRef.current.remove()
        spedMapInstanceRef.current = null
        spedMarkerLayerRef.current = null
        spedMarkerRefs.current.clear()
      }
    }
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

  const sanitizeCsvValue = (value) => {
    if (value === null || value === undefined) return ''
    const text = String(value).replace(/\r?\n|\r/g, ' ').trim()
    return `"${text.replace(/"/g, '""')}"`
  }

  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const exportReportsCsv = () => {
    const now = new Date()
    const rows = []

    rows.push(['SignCast Admin Report'])
    rows.push(['Generated At', now.toISOString()])
    rows.push(['Generated By', adminName || session?.email || 'Admin'])
    rows.push([])

    rows.push(['Summary'])
    rows.push(['Metric', 'Value'])
    rows.push(['Total Users', userCount])
    rows.push(['Tests Completed', stats.totalScores])
    rows.push(['FSL Samples DB', stats.totalSamples])
    rows.push(['Verified Samples', stats.verifiedSamples])
    rows.push(['Unique Labels', stats.uniqueLabels])
    rows.push([])

    rows.push(['Scores By Test Type'])
    rows.push(['Test Type', 'Count'])
    if ((stats.scoresByType || []).length === 0) {
      rows.push(['No data', 0])
    } else {
      stats.scoresByType.forEach((item) => {
        rows.push([item.type, item.count])
      })
    }
    rows.push([])

    rows.push(['Top Scorers Leaderboard'])
    rows.push(['Rank', 'Name', 'Email', 'Highest Score', 'Test Type'])
    if ((stats.topScorers || []).length === 0) {
      rows.push(['-', 'No records', '', '', ''])
    } else {
      stats.topScorers.forEach((scorer, index) => {
        rows.push([
          index + 1,
          scorer.name || 'Anonymous',
          scorer.email || '',
          scorer.score || 0,
          scorer.test_type || '',
        ])
      })
    }

    const csv = rows
      .map((row) => row.map(sanitizeCsvValue).join(','))
      .join('\n')

    const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `signcast-report-${stamp}.csv`
    downloadFile(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename)
    setActionStatus({ type: 'success', message: 'CSV report downloaded.' })
  }

  const exportReportsPdf = () => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 30
      const contentWidth = pageWidth - margin * 2
      const generatedAt = new Date()

      // Outer page border
      doc.setDrawColor(207, 217, 228)
      doc.setLineWidth(1)
      doc.rect(margin - 10, margin - 10, pageWidth - (margin - 10) * 2, pageHeight - (margin - 10) * 2)

      // Header band
      doc.setFillColor(13, 53, 41)
      doc.roundedRect(margin, margin, contentWidth, 82, 10, 10, 'F')

      // Simple logo box
      doc.setFillColor(225, 255, 241)
      doc.roundedRect(margin + 16, margin + 16, 50, 50, 9, 9, 'F')
      doc.setTextColor(15, 59, 45)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.text('SC', margin + 41, margin + 47, { align: 'center' })

      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(21)
      doc.text('SignCast', margin + 80, margin + 38)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.text('Admin Performance Report', margin + 80, margin + 58)

      doc.setFontSize(9)
      doc.text(`Generated: ${generatedAt.toLocaleString()}`, pageWidth - margin - 14, margin + 36, { align: 'right' })
      doc.text(`Prepared by: ${adminName || session?.email || 'Administrator'}`, pageWidth - margin - 14, margin + 54, { align: 'right' })

      // Summary cards
      const summaryTop = margin + 100
      const summaryGap = 10
      const summaryCardWidth = (contentWidth - summaryGap * 3) / 4
      const summaryCardHeight = 74
      const summaryItems = [
        ['Total Users', userCount.toLocaleString()],
        ['Tests Completed', stats.totalScores.toLocaleString()],
        ['FSL Samples', stats.totalSamples.toLocaleString()],
        ['Verified Samples', stats.verifiedSamples.toLocaleString()],
      ]

      summaryItems.forEach(([label, value], index) => {
        const x = margin + index * (summaryCardWidth + summaryGap)
        doc.setFillColor(247, 251, 249)
        doc.setDrawColor(196, 227, 213)
        doc.roundedRect(x, summaryTop, summaryCardWidth, summaryCardHeight, 8, 8, 'FD')
        doc.setTextColor(39, 120, 92)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(label.toUpperCase(), x + 10, summaryTop + 22)
        doc.setTextColor(15, 23, 42)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(18)
        doc.text(value, x + 10, summaryTop + 50)
      })

      const reportBodyY = summaryTop + summaryCardHeight + 24
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.setFontSize(12)
      doc.text('Scores by Test Type', margin, reportBodyY)

      autoTable(doc, {
        startY: reportBodyY + 8,
        margin: { left: margin, right: margin },
        styles: {
          font: 'helvetica',
          fontSize: 10,
          cellPadding: 6,
          lineColor: [220, 228, 236],
          lineWidth: 0.6,
          textColor: [17, 24, 39],
        },
        headStyles: {
          fillColor: [232, 245, 238],
          textColor: [12, 53, 41],
          fontStyle: 'bold',
          lineColor: [180, 214, 198],
        },
        body: (stats.scoresByType || []).length > 0
          ? stats.scoresByType.map((item) => [
              (item.type || 'unknown').toString().replace(/-/g, ' '),
              Number(item.count || 0).toLocaleString(),
            ])
          : [['No data available', '0']],
        head: [['Test Type', 'Count']],
        tableLineColor: [180, 214, 198],
        tableLineWidth: 0.8,
      })

      const nextY = doc.lastAutoTable.finalY + 18
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Top Scorers Leaderboard', margin, nextY)

      autoTable(doc, {
        startY: nextY + 8,
        margin: { left: margin, right: margin },
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 6,
          lineColor: [220, 228, 236],
          lineWidth: 0.6,
          textColor: [17, 24, 39],
        },
        headStyles: {
          fillColor: [232, 245, 238],
          textColor: [12, 53, 41],
          fontStyle: 'bold',
          lineColor: [180, 214, 198],
        },
        body: (stats.topScorers || []).length > 0
          ? stats.topScorers.slice(0, 12).map((scorer, index) => [
              String(index + 1),
              scorer.name || 'Anonymous',
              scorer.email || 'N/A',
              `${Number(scorer.score || 0).toLocaleString()} pts`,
              (scorer.test_type || 'n/a').toString(),
            ])
          : [['-', 'No records available', '', '', '']],
        head: [['Rank', 'User', 'Email', 'Highest Score', 'Test Type']],
        tableLineColor: [180, 214, 198],
        tableLineWidth: 0.8,
      })

      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages()
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page)
        doc.setDrawColor(225, 232, 238)
        doc.line(margin, pageHeight - 44, pageWidth - margin, pageHeight - 44)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(100, 116, 139)
        doc.text('SignCast Admin Portal • Confidential Internal Report', margin, pageHeight - 26)
        doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 26, { align: 'right' })
      }

      const stamp = generatedAt.toISOString().replace(/[:.]/g, '-').slice(0, 19)
      doc.save(`signcast-report-${stamp}.pdf`)
      setActionStatus({ type: 'success', message: 'PDF report downloaded successfully.' })
    } catch (error) {
      setActionStatus({ type: 'error', message: `Unable to export PDF: ${error.message}` })
    }
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
    if (activeSection === 'centers') return spedStatus
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
                <th>Strikes</th>
                <th>Registered At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isSelf = user.id === session?.userId
                const isBusy = mutatingUserId === user.id
                const isActive = user.isActive !== false
                const isLocked = user.camera_lock_until && user.camera_lock_until > Date.now()
                const strikes = user.vulgarity_strikes || 0

                return (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name || 'Anonymous'} {strikes > 0 && <span title={`${strikes} vulgarity strikes`} style={{fontSize: '12px', cursor: 'help'}}>🚩</span>}</strong>
                      <div style={{fontSize: '12px', color: '#6b7280'}}>{user.email}</div>
                    </td>
                    <td>{user.isAdmin ? 'Admin' : 'Student'}</td>
                    <td>
                      {isLocked ? (
                        <span className="admin-status-badge inactive" title={`Locked until ${new Date(user.camera_lock_until).toLocaleTimeString()}`}>Locked Out</span>
                      ) : (
                        <span className={!isActive ? 'admin-status-badge inactive' : user.isAdmin ? 'admin-status-badge admin' : 'admin-status-badge'}>
                          {!isActive ? 'Inactive' : user.isAdmin ? 'Privileged' : 'Active'}
                        </span>
                      )}
                    </td>
                    <td style={{textAlign: 'center', color: strikes > 0 ? '#ef4444' : 'inherit'}}>{strikes}</td>
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
                <div className="dictionary-category-header">
                  <h3>{cat.category || 'uncategorized'}</h3>
                  <p>{cat.count} samples • {cat.uniqueLabels} unique signs</p>
                </div>
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

  const renderTraining = () => (
    <div className="admin-content-grid" style={{ gridTemplateColumns: '1fr', gridTemplateAreas: '"verify" "train"' }}>
      <section className="admin-table-card" style={{gridArea: 'verify'}}>
        <div className="admin-card-heading">
          <p className="eyebrow">Pending Dataset Verification</p>
          <span>Review user submissions before adding to live dataset</span>
        </div>
        
        {pendingSamples.length === 0 ? (
          <div className="admin-empty-state">
            <p>No pending samples require verification.</p>
          </div>
        ) : (
          <div className="admin-table-wrap" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Proposed Label</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingSamples.map((sample) => (
                  <tr key={sample.filename}>
                    <td>
                      <img 
                        src={`${API_BASE}/admin/pending/image/${sample.label}/${sample.filename}`} 
                        alt="Pending" 
                        style={{width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px'}} 
                        loading="lazy"
                      />
                    </td>
                    <td><strong>{sample.label}</strong></td>
                    <td>{new Date(parseInt(sample.timestamp)).toLocaleString()}</td>
                    <td>
                      <div className="admin-action-group">
                        <button className="admin-action-button success" onClick={() => verifySample(sample, true)}>✅ Approve</button>
                        <button className="admin-action-button danger" onClick={() => verifySample(sample, false)}>❌ Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-table-card" style={{gridArea: 'train'}}>
         <div className="admin-card-heading">
          <p className="eyebrow">AI Model Training Engine</p>
          <span>Retrain the Landmark Recognition model with the verified dataset</span>
        </div>
        <div style={{ padding: '20px' }}>
          <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
            After approving new signs above, click the button below to execute the Python ML training script. 
            This will rebuild the underlying TensorFlow/Scikit-Learn models and deploy them to the frontend instantly.
          </p>
          <button 
            className="admin-action-button success" 
            style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#3b82f6', color: 'white' }}
            onClick={trainModel}
            disabled={isTraining}
          >
            {isTraining ? '🚀 Training in Progress...' : '🚀 Train AI Model'}
          </button>

          {trainingLogs && (
            <div style={{ marginTop: '20px', backgroundColor: '#1e1e1e', color: '#0f0', padding: '15px', borderRadius: '8px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>
              {trainingLogs}
            </div>
          )}
        </div>
      </section>
    </div>
  )

  const renderReports = () => (
    <div className="admin-content-grid admin-reports-grid">
      <section className="admin-metrics admin-reports-metrics" style={{gridArea: 'metrics'}}>
        <article className="admin-stat-card">
          <span className="admin-stat-icon">🧮</span>
          <p>Total Tests Recorded</p>
          <strong>{stats.totalScores.toLocaleString()}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon">🧪</span>
          <p>Test Types Tracked</p>
          <strong>{stats.scoresByType.length.toLocaleString()}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon">🏆</span>
          <p>Highest Recorded Score</p>
          <strong>{stats.topScorers[0]?.score ? `${stats.topScorers[0].score} pts` : '0 pts'}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon">📅</span>
          <p>Active Days Tracked</p>
          <strong>{stats.dailyScores.length.toLocaleString()}</strong>
        </article>
      </section>

      <section className="admin-table-card admin-reports-table" style={{gridArea: 'table'}}>
        <div className="admin-card-heading">
          <p className="eyebrow">Top Scorers Leaderboard</p>
        </div>
        {stats.topScorers.length === 0 ? (
          <div className="admin-empty-state admin-reports-empty">
            <p>No scores recorded yet.</p>
            <span>Leaderboard data will appear after users complete test sessions.</span>
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

      <section className="admin-table-card admin-reports-distribution" style={{ gridArea: 'distribution' }}>
        <div className="admin-card-heading" style={{ marginBottom: '10px' }}>
          <p className="eyebrow">Score Distribution By Test Type</p>
        </div>

        {stats.scoresByType.length === 0 ? (
          <div className="admin-empty-state admin-reports-empty compact">
            <p>No test-type distribution available.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Test Type</th>
                  <th>Total Attempts</th>
                </tr>
              </thead>
              <tbody>
                {stats.scoresByType.map((item) => (
                  <tr key={item.type}>
                    <td style={{ textTransform: 'capitalize' }}>{(item.type || 'unknown').replace(/-/g, ' ')}</td>
                    <td><strong>{item.count}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="admin-config-card admin-reports-export" style={{gridArea: 'config'}}>
        <div className="admin-card-heading">
           <p className="eyebrow">Report Export Options</p>
        </div>
        <div className="report-export-panel">
          <p>Download a professional SignCast report with branded header, bordered tables, and latest admin analytics.</p>
          <div className="report-export-buttons">
            <button className="admin-action-button success" onClick={exportReportsPdf}>Download PDF Report</button>
            <button className="admin-action-button neutral" onClick={exportReportsCsv}>Download CSV Data</button>
          </div>
          <div className="report-export-meta">
            <span>Cloud: {healthData.cloudServices}</span>
            <span>Uptime: {healthData.uptime}</span>
            <span>Last Sync: {lastSynced ? formatAdminDate(lastSynced) : 'Never'}</span>
            <span>Unique Labels: {stats.uniqueLabels.toLocaleString()}</span>
            <span>Verified Samples: {stats.verifiedSamples.toLocaleString()}</span>
            <span>Admin Status: {adminStatus}</span>
          </div>
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

  const renderSpedCenters = () => (
    <div className="admin-content-grid" style={{ gridTemplateColumns: 'minmax(0, 1.15fr) minmax(330px, 0.85fr)', gridTemplateAreas: '"map table"' }}>
      <section className="admin-table-card admin-sped-map-card" style={{ gridArea: 'map' }}>
        <div className="admin-card-heading">
          <p className="eyebrow">SPED Centers Map (Philippines)</p>
          <span>{spedStatus}</span>
        </div>

        <div ref={spedMapRef} className="admin-sped-map" aria-label="SPED centers map" />

        {isSpedLoading && (
          <div className="admin-sped-map-overlay">
            <p>Loading map points from OpenStreetMap...</p>
          </div>
        )}

        {selectedSpedCenter && (
          <div className="admin-sped-selected">
            <strong>{selectedSpedCenter.name}</strong>
            <span>{selectedSpedCenter.address}</span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${selectedSpedCenter.lat}&mlon=${selectedSpedCenter.lon}#map=14/${selectedSpedCenter.lat}/${selectedSpedCenter.lon}`}
              target="_blank"
              rel="noreferrer"
            >
              Open in OpenStreetMap
            </a>
          </div>
        )}
      </section>

      <section className="admin-table-card" style={{ gridArea: 'table' }}>
        <div className="admin-card-heading">
          <p className="eyebrow">Detected Centers</p>
          <button className="admin-action-button neutral" onClick={loadSpedCenters} disabled={isSpedLoading}>
            {isSpedLoading ? 'Refreshing...' : 'Refresh Map Data'}
          </button>
        </div>

        {spedError ? (
          <div className="admin-empty-state">
            <p>{spedError}</p>
          </div>
        ) : spedCenters.length === 0 ? (
          <div className="admin-empty-state">
            <p>No SPED centers available yet. Try refreshing map data.</p>
          </div>
        ) : (
          <div className="admin-table-wrap" style={{ maxHeight: '520px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Center</th>
                  <th>Region</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {spedCenters.map((center) => (
                  <tr key={center.id}>
                    <td>
                      <button
                        type="button"
                        className="admin-link-button"
                        onClick={() => focusSpedCenter(center)}
                      >
                        {center.name}
                      </button>
                      <div style={{ fontSize: '12px', color: '#6b7280', maxWidth: '320px', whiteSpace: 'normal' }}>{center.address}</div>
                    </td>
                    <td>{center.region}</td>
                    <td>
                      <button className="admin-action-button success" onClick={() => focusSpedCenter(center)}>Locate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
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

        <div className="admin-content-grid" style={activeSection !== 'dashboard' && activeSection !== 'dictionary' && activeSection !== 'training' ? { gridTemplateColumns: '1fr', gridTemplateAreas: '"table"' } : {}}>
          {activeSection === 'dashboard' && renderDashboard()}
          {activeSection === 'users' && renderUsers()}
          {activeSection === 'dictionary' && renderDictionary()}
          {activeSection === 'training' && renderTraining()}
          {activeSection === 'reports' && renderReports()}
          {activeSection === 'audit' && renderAuditLogs()}
          {activeSection === 'centers' && renderSpedCenters()}
        </div>

        <footer className="admin-footer">
          (c) 2026 SignCast | Admin Portal | Technological University of the Philippines - Taguig
        </footer>
      </div>
    </section>
  )
}
