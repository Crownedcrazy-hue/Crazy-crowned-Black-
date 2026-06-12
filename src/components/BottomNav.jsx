const NAV_ITEMS = [
  { id: 'mensaje', label: 'Mensaje', icon: MessageIcon },
  { id: 'agentes', label: 'Agentes', icon: AgentesIcon },
  { id: 'mascota', label: '', icon: MascotaIcon },
  { id: 'conocimiento', label: 'Conocimiento', icon: KnowledgeIcon },
  { id: 'cuenta', label: 'Cuenta', icon: CuentaIcon },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav style={nav}>
      {NAV_ITEMS.map(item => {
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            style={navItem}
            onClick={() => onChange(item.id)}
            aria-label={item.label}
          >
            <item.icon active={isActive} />
            {item.label ? (
              <span style={isActive ? activeLabelStyle : labelStyle}>
                {item.label}
              </span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

function MessageIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3C7.03 3 3 6.58 3 11c0 2.16 1 4.1 2.62 5.52L5 21l4.57-2.05C10.33 19.3 11.15 19.4 12 19.4c4.97 0 9-3.58 9-8s-4.03-8-9-8Z"
        fill={active ? '#1c1c1e' : 'none'}
        stroke={active ? '#1c1c1e' : '#8e8e93'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AgentesIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="13" rx="3"
        fill={active ? '#1c1c1e' : 'none'}
        stroke={active ? '#1c1c1e' : '#8e8e93'}
        strokeWidth="1.6"/>
      <circle cx="9" cy="12" r="1.5" fill={active ? '#fff' : '#8e8e93'}/>
      <circle cx="15" cy="12" r="1.5" fill={active ? '#fff' : '#8e8e93'}/>
      <path d="M8 4h8" stroke={active ? '#1c1c1e' : '#8e8e93'} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

function MascotaIcon() {
  return (
    <div style={mascotaWrap}>
      <div style={mascotaCircle}>
        <span style={{ fontSize: 22 }}>🐱</span>
      </div>
    </div>
  )
}

function KnowledgeIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
        stroke={active ? '#1c1c1e' : '#8e8e93'}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"
        fill={active ? '#1c1c1e' : 'none'}
        stroke={active ? '#1c1c1e' : '#8e8e93'}
        strokeWidth="1.6"
      />
      <path d="M9 7h7M9 11h5" stroke={active ? '#fff' : '#8e8e93'} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

function CuentaIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12" cy="8" r="4"
        fill={active ? '#1c1c1e' : 'none'}
        stroke={active ? '#1c1c1e' : '#8e8e93'}
        strokeWidth="1.6"
      />
      <path
        d="M4 20c0-3.31 3.58-6 8-6s8 2.69 8 6"
        stroke={active ? '#1c1c1e' : '#8e8e93'}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

const nav = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-around',
  background: '#fff',
  borderTop: '1px solid rgba(0,0,0,0.08)',
  padding: '8px 0 24px',
  flexShrink: 0,
}

const navItem = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 3,
  padding: '4px 8px',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  minWidth: 52,
}

const activeLabelStyle = {
  fontSize: 10,
  fontWeight: 600,
  color: '#1c1c1e',
}

const labelStyle = {
  fontSize: 10,
  fontWeight: 400,
  color: '#8e8e93',
}

const mascotaWrap = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const mascotaCircle = {
  width: 42,
  height: 42,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #a78bfa, #818cf8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(139,92,246,0.4)',
}
