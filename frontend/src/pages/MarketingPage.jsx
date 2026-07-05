export default function MarketingPage() {
  return (
    <section className="marketing-layout">
      <article className="marketing-hero">
        <div className="marketing-hero-grid">
          <div className="marketing-hero-copy">
            <p className="eyebrow">Filipino Sign Language Recognition Platform</p>
            <h1>Professional-grade FSL recognition for modern teams</h1>
            <p>
              SignCast delivers real-time Filipino Sign Language recognition in a secure web workspace.
              From learning sessions to operational workflows, every feature is designed for clarity,
              speed, and accessibility.
            </p>
            <div className="marketing-actions">
              <a className="submit-button" href="#/login">Open workspace</a>
              <a className="outline-button" href="#/register">Create account</a>
            </div>
          </div>
          <div className="hero-stat-grid">
            <article className="hero-stat-card">
              <p className="hero-stat-label">Response speed</p>
              <strong>&lt; 200 ms</strong>
              <p>Live feedback for smoother signing sessions.</p>
            </article>
            <article className="hero-stat-card">
              <p className="hero-stat-label">Recognition model</p>
              <strong>21-point tracking</strong>
              <p>Precise landmark detection with confidence scoring.</p>
            </article>
            <article className="hero-stat-card">
              <p className="hero-stat-label">Built for teams</p>
              <strong>Shared workflow</strong>
              <p>One unified workspace for learners and educators.</p>
            </article>
          </div>
        </div>
      </article>

      <section className="marketing-section">
        <div className="section-heading">
          <p className="eyebrow">What we do</p>
          <h2>Real-time recognition and translation in one web workspace</h2>
        </div>

        <div className="section-content">
          <p>
            SignCast uses computer vision and machine learning to identify hand landmarks, track motion,
            and translate FSL signs into clear output. The platform processes camera input, measures
            confidence, and generates text plus optional speech feedback instantly.
          </p>
          <div className="process-grid">
            <article className="process-step">
              <span className="process-index">01</span>
              <h3>Capture</h3>
              <p>Video input is read in real time with consistent frame analysis.</p>
            </article>
            <article className="process-step">
              <span className="process-index">02</span>
              <h3>Recognize</h3>
              <p>Landmarks and motion patterns are mapped against trained FSL models.</p>
            </article>
            <article className="process-step">
              <span className="process-index">03</span>
              <h3>Output</h3>
              <p>Structured text and spoken feedback are produced with confidence metrics.</p>
            </article>
          </div>
          <ul className="feature-list">
            <li><strong>Live hand tracking:</strong> 21-point landmark detection for precise gesture analysis</li>
            <li><strong>Confidence metrics:</strong> Understand certainty per recognized sign</li>
            <li><strong>Phrase building:</strong> Create and organize complete sentence output</li>
            <li><strong>Accessible output:</strong> Generate transcripts and speech synthesis instantly</li>
          </ul>
        </div>
      </section>

      <section className="marketing-section">
        <div className="section-heading">
          <p className="eyebrow">What we want to achieve</p>
          <h2>Make FSL communication more accessible for every community</h2>
        </div>
        <div className="section-content">
          <p>
            We believe sign language should be as accessible as spoken language. Our mission is to remove
            barriers for learners, support interpreters with faster transcription, and help educators teach
            FSL more effectively. We are building a future
            where Deaf and Hard of Hearing communities can communicate seamlessly with everyone around them.
          </p>
          <div className="achievement-grid">
            <div className="achievement-card">
              <div className="achievement-icon"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#0f766e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg></div>
              <p className="achievement-eyebrow">For learners</p>
              <p>Practice and master FSL signs with instant feedback from our recognition engine.</p>
            </div>
            <div className="achievement-card">
              <div className="achievement-icon"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#0f766e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h6"/></svg></div>
              <p className="achievement-eyebrow">For interpreters</p>
              <p>Speed up your workflow with AI-assisted transcription and phrase management.</p>
            </div>
            <div className="achievement-card">
              <div className="achievement-icon"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#0f766e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg></div>
              <p className="achievement-eyebrow">For educators</p>
              <p>Teach FSL with structured lesson workflows and measurable student progress.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="section-heading">
          <p className="eyebrow">Why SignCast</p>
          <h2>Everything your team needs in one web workspace</h2>
        </div>
        <div className="section-content">
          <p>
            SignCast combines recognition, phrase management, and operational oversight in one browser-based
            platform so your team can work faster without switching tools.
          </p>
        </div>
        <div className="help-grid">
          <article>
            <div className="help-icon help-icon-camera">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 8V4M12 20v-4M16 12h4M4 12h4M15.5 8.5l2-2M8.5 15.5l-2 2M15.5 15.5l2 2M8.5 8.5l-2-2" />
              </svg>
            </div>
            <span>Recognition studio</span>
            <h3>Run live sessions with confidence</h3>
            <p>
              Start camera capture directly in the browser and receive instant results with confidence
              visibility on every sign.
            </p>
          </article>
          <article>
            <div className="help-icon help-icon-web">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M2 17h20" />
                <path d="M6 20h12" />
              </svg>
            </div>
            <span>Phrase workspace</span>
            <h3>Build reliable transcripts</h3>
            <p>
              Organize recognized output into reusable phrases and review results with a clear, structured
              interface.
            </p>
          </article>
          <article>
            <div className="help-icon help-icon-admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span>Operations control</span>
            <h3>Manage teams and governance</h3>
            <p>
              Set roles, monitor usage, and standardize FSL workflows across your organization from one dashboard.
            </p>
          </article>
        </div>
      </section>

      <div className="marketing-grid">
        <article>
          <div className="grid-icon"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#0f766e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg></div>
          <span>Features</span>
          <h3>Recognition workspace</h3>
          <p>Live camera input, phrase confidence, sentence transcript, and speech output in one interface.</p>
        </article>
        <article>
          <div className="grid-icon"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
          <span>Getting started</span>
          <h3>Launch in minutes</h3>
          <p>Create an account, open your workspace, and begin FSL recognition with no complex setup.</p>
        </article>
        <article>
          <div className="grid-icon"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#0f766e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <span>Support and community</span>
          <h3>Learn from the community</h3>
          <p>Join our learner community, access FSL guides, and get help from interpreters and educators building with SignCast.</p>
        </article>
      </div>

      <section className="marketing-cta">
        <div className="cta-visual">
          <div className="cta-shape cta-shape-1" />
          <div className="cta-shape cta-shape-2" />
          <div className="cta-shape cta-shape-3" />
        </div>
        <h2>Ready to elevate your FSL workflow?</h2>
        <p>Bring your team into a professional SignCast workspace built for modern communication.</p>
        <div className="marketing-actions">
          <a className="submit-button" href="#/register">Create your workspace</a>
          <a className="outline-button" href="#/login">Already a member? Sign in</a>
        </div>
      </section>
    </section>
  )
}
