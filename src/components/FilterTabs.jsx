const TABS = [
  { id: 'hacer', label: 'Hacer' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'instagram', label: 'Instagram' },
]

export default function FilterTabs({ active, onChange }) {
  return (
    <div style={wrapper}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          style={active === tab.id ? activeTab : inactiveTab}
          onClick={() => onChange(tab.id)}
        >
          {tab.id === 'whatsapp' && <WhatsAppDot />}
          {tab.id === 'instagram' && <InstagramDot />}
          <span style={active === tab.id ? activeLabelStyle : labelStyle}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  )
}

function WhatsAppDot() {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: '#25d366', flexShrink: 0,
    }} />
  )
}

function InstagramDot() {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
      flexShrink: 0,
    }} />
  )
}

const wrapper = {
  display: 'flex',
  gap: 8,
  padding: '4px 16px 12px',
  background: '#f2f2f7',
}

const baseTab = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 14px',
  borderRadius: 20,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  border: 'none',
  transition: 'all 0.15s',
}

const activeTab = {
  ...baseTab,
  background: '#1c1c1e',
  color: '#fff',
}

const inactiveTab = {
  ...baseTab,
  background: '#fff',
  color: '#3c3c43',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
}

const activeLabelStyle = { color: '#fff' }
const labelStyle = { color: '#3c3c43' }
