import { getDisplayName } from '../helpers.js'

export default function DashboardPage({ session }) {
  const displayName = getDisplayName(session)
  const firstName = displayName.split(' ')[0] || 'there'
  const dashboardCards = [
    {
      href: '#/recognizer',
      label: 'Translate',
      title: 'Live recognition',
      body: 'Open the camera workspace for sign detection, transcript building, and speech output.',
      metric: '94%',
    },
    {
      href: '#/trainer',
      label: 'Trainer',
      title: 'Gesture training',
      body: 'Capture labeled FSL samples and grow the recognition dataset from your webcam.',
      metric: '215',
    },
    {
      href: '#/library',
      label: 'Library',
      title: 'Sign library',
      body: 'Review stored signs, add phrase details, and refresh learned samples from the API.',
      metric: 'FSL',
    },
  ]

  return (
    <section className="home-dashboard">
      <div className="home-hero dashboard-card">
        <div>
          <p className="eyebrow">SignCast workspace</p>
          <h1>Welcome back, {firstName}</h1>
          <p>
            Your FSL tools are connected here: translate signs, train gestures, and manage the learning library from one authenticated hub.
          </p>
        </div>
        <div className="home-hero-meter" aria-label="Translation readiness">
          <span>Ready</span>
          <strong>98%</strong>
        </div>
      </div>

      <div className="home-action-grid">
        {dashboardCards.map((card) => (
          <a className="home-action-card dashboard-card" href={card.href} key={card.href}>
            <span>{card.label}</span>
            <strong>{card.metric}</strong>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </a>
        ))}
      </div>

      <section className="home-status dashboard-card">
        <div className="dashboard-card-heading">
          <p className="eyebrow">Connected pages</p>
          <span>All protected routes</span>
        </div>
        <div className="home-status-grid">
          <div>
            <strong>Translate</strong>
            <span>Camera, transcript, speech</span>
          </div>
          <div>
            <strong>Trainer</strong>
            <span>Sample capture and stats</span>
          </div>
          <div>
            <strong>Library</strong>
            <span>Stored signs and refresh</span>
          </div>
        </div>
      </section>
    </section>
  )
}
