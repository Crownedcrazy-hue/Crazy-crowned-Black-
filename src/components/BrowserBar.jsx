export default function BrowserBar() {
  return (
    <div style={wrapper}>
      <button style={navBtn} aria-label="Atrás">
        <svg width="9" height="16" viewBox="0 0 9 16" fill="none">
          <path d="M8 1L1 8l7 7" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div style={urlBar}>
        <LockIcon />
        <span style={urlText}>app.dealism.ai</span>
      </div>

      <button style={navBtn} aria-label="Compartir">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 1v11M4 6l5-5 5 5" stroke="#007aff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" stroke="#007aff" strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
      <rect x="1" y="5.5" width="9" height="7" rx="1.5" stroke="#3c3c43" strokeOpacity="0.6" strokeWidth="1.2"/>
      <path d="M3 5.5V3.5a2.5 2.5 0 0 1 5 0v2" stroke="#3c3c43" strokeOpacity="0.6" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

const wrapper = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 14px 10px',
  background: '#f2f2f7',
}

const navBtn = {
  width: 34,
  height: 34,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const urlBar = {
  flex: 1,
  background: '#e5e5ea',
  borderRadius: 10,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  padding: '0 12px',
}

const urlText = {
  fontSize: 15,
  fontWeight: 400,
  color: '#1c1c1e',
}
