export function AdminBrandLogo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M9 17.5V9.25C9 8.15 9.9 7.25 11 7.25C12.1 7.25 13 8.15 13 9.25V15.25" />
      <path d="M13 15.25V6.75C13 5.65 13.9 4.75 15 4.75C16.1 4.75 17 5.65 17 6.75V15" />
      <path d="M17 15V8.25C17 7.15 17.9 6.25 19 6.25C20.1 6.25 21 7.15 21 8.25V16" />
      <path d="M21 16V11.5C21 10.4 21.9 9.5 23 9.5C24.1 9.5 25 10.4 25 11.5V19.25C25 24 21.15 27.25 16.6 27.25H15.1C11.25 27.25 8 24 8 20.15V17.5H9Z" />
      <path d="M8 17.5H5.8C4.65 17.5 3.75 18.4 3.75 19.55C3.75 21.65 5.45 23.25 7.5 23.25H9.4" />
    </svg>
  )
}

export function AdminNavIcon({ name }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const icons = {
    dashboard: (
      <>
        <path d="M3 11.5 12 4l9 7.5" {...common} />
        <path d="M5.5 10.5V20h13v-9.5" {...common} />
        <path d="M9.5 20v-5h5v5" {...common} />
      </>
    ),
    users: (
      <>
        <path d="M8.5 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" {...common} />
        <path d="M2.8 20c.7-3.6 2.7-5.4 5.7-5.4s5 1.8 5.7 5.4" {...common} />
        <path d="M16 8.2a3 3 0 0 1 0 5.6" {...common} />
        <path d="M17.2 16c1.7.7 2.9 2 3.4 4" {...common} />
      </>
    ),
    dictionary: (
      <>
        <path d="M6 4.5h10.5A2.5 2.5 0 0 1 19 7v13H7a2 2 0 0 1-2-2V5.5c0-.6.4-1 1-1Z" {...common} />
        <path d="M8 8h7" {...common} />
        <path d="M8 12h6" {...common} />
        <path d="M7 20a2 2 0 0 1 2-2h10" {...common} />
      </>
    ),
    centers: (
      <>
        <path d="M4.5 20h15" {...common} />
        <path d="M6 20V8l6-3 6 3v12" {...common} />
        <path d="M9 20v-5h6v5" {...common} />
        <path d="M9 10h.01M12 10h.01M15 10h.01" {...common} />
      </>
    ),
    health: (
      <>
        <path d="M12 20s-7-4.5-8.7-9.2C2.3 8 3.9 5.5 6.7 5.5c1.7 0 3.1.9 3.9 2.2.8-1.3 2.2-2.2 3.9-2.2 2.8 0 4.4 2.5 3.4 5.3C19 15.5 12 20 12 20Z" {...common} />
        <path d="M7.2 12h2.6l1.1-2.2 2.2 4.4 1.1-2.2h2.6" {...common} />
      </>
    ),
    audit: (
      <>
        <path d="M7 4h8l4 4v12H7V4Z" {...common} />
        <path d="M15 4v5h4" {...common} />
        <path d="M9.5 13h6M9.5 16h5" {...common} />
      </>
    ),
    api: (
      <>
        <path d="M9 7 4 12l5 5" {...common} />
        <path d="m15 7 5 5-5 5" {...common} />
        <path d="m13 5-2 14" {...common} />
      </>
    ),
    reports: (
      <>
        <path d="M5 20V5h14v15H5Z" {...common} />
        <path d="M8.5 16v-4M12 16V8M15.5 16v-6" {...common} />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H5v14h5" {...common} />
        <path d="M14 8l4 4-4 4" {...common} />
        <path d="M8 12h10" {...common} />
      </>
    ),
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>
}
