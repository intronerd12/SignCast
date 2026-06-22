export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 17.5V9.25C9 8.15 9.9 7.25 11 7.25C12.1 7.25 13 8.15 13 9.25V15.25" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M13 15.25V6.75C13 5.65 13.9 4.75 15 4.75C16.1 4.75 17 5.65 17 6.75V15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M17 15V8.25C17 7.15 17.9 6.25 19 6.25C20.1 6.25 21 7.15 21 8.25V16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M21 16V11.5C21 10.4 21.9 9.5 23 9.5C24.1 9.5 25 10.4 25 11.5V19.25C25 24 21.15 27.25 16.6 27.25H15.1C11.25 27.25 8 24 8 20.15V17.5H9Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 17.5H5.8C4.65 17.5 3.75 18.4 3.75 19.55C3.75 21.65 5.45 23.25 7.5 23.25H9.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export function BrandLockup() {
  return (
    <a className="brand-lockup" href="#/" aria-label="SignCast home">
      <BrandMark />
      <span>
        <strong>SignCast</strong>
        <small>Filipino Sign Language mapper</small>
      </span>
    </a>
  )
}

export function VectorGesturePreview() {
  return (
    <div className="gesture-preview" aria-label="Vector gesture preview">
      <div className="preview-toolbar">
        <span>Live FSL capture</span>
        <strong>Stable</strong>
      </div>
      <svg className="gesture-map" viewBox="0 0 520 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Hand landmarks connected by vector lines">
        <rect x="18" y="18" width="484" height="264" rx="18" fill="currentColor" opacity="0.06" />
        <path className="measure" d="M76 220 L172 164 L259 122 L351 91 L438 62" />
        <path className="measure" d="M175 238 L226 181 L274 129 L320 82" />
        <path className="trace" d="M126 224 C111 192 114 160 140 140 C161 122 184 132 196 152 C210 118 238 108 259 129 C273 94 303 82 322 106 C337 72 369 66 387 94 C407 125 398 168 375 199 C337 250 263 268 193 247 C166 239 145 232 126 224Z" />
        <path className="trace" d="M139 140 L92 91 M196 152 L180 60 M259 129 L261 42 M322 106 L346 45 M387 94 L436 54" />
        <circle className="joint" cx="126" cy="224" r="9" />
        <circle className="joint active" cx="139" cy="140" r="8" />
        <circle className="joint" cx="92" cy="91" r="8" />
        <circle className="joint active" cx="196" cy="152" r="8" />
        <circle className="joint" cx="180" cy="60" r="8" />
        <circle className="joint active" cx="259" cy="129" r="8" />
        <circle className="joint" cx="261" cy="42" r="8" />
        <circle className="joint active" cx="322" cy="106" r="8" />
        <circle className="joint" cx="346" cy="45" r="8" />
        <circle className="joint active" cx="387" cy="94" r="8" />
        <circle className="joint" cx="436" cy="54" r="8" />
        <circle className="joint" cx="193" cy="247" r="8" />
        <circle className="joint" cx="375" cy="199" r="8" />
      </svg>
      <div className="preview-readout">
        <span>
          <strong>21</strong>
          landmarks
        </span>
        <span>
          <strong>3D</strong>
          vector points
        </span>
        <span>
          <strong>FSL</strong>
          dictionary
        </span>
      </div>
    </div>
  )
}
