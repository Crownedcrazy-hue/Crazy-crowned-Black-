export default function StatusBar() {
  return (
    <div style={bar}>
      <span style={time}>16:40</span>
      <div style={notch} />
      <div style={icons}>
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon />
      </div>
    </div>
  )
}

function SignalIcon() {
  return (
    <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
      <rect x="0" y="6" width="3" height="6" rx="0.5" fill="#1c1c1e"/>
      <rect x="4.5" y="4" width="3" height="8" rx="0.5" fill="#1c1c1e"/>
      <rect x="9" y="2" width="3" height="10" rx="0.5" fill="#1c1c1e"/>
      <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="#1c1c1e"/>
    </svg>
  )
}

function WifiIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
      <path d="M8 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" fill="#1c1c1e"/>
      <path d="M3.5 6.5A6.5 6.5 0 0 1 8 4.8a6.5 6.5 0 0 1 4.5 1.7" stroke="#1c1c1e" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
      <path d="M1 4A9.9 9.9 0 0 1 8 1.3 9.9 9.9 0 0 1 15 4" stroke="#1c1c1e" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

function BatteryIcon() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
      <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="#1c1c1e" strokeOpacity="0.35"/>
      <rect x="2" y="2" width="16" height="8" rx="2" fill="#1c1c1e"/>
      <path d="M23 4v4a2 2 0 0 0 0-4Z" fill="#1c1c1e" fillOpacity="0.4"/>
    </svg>
  )
}

const bar = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 28px 6px',
  background: '#f2f2f7',
  position: 'relative',
  zIndex: 10,
}

const time = {
  fontSize: 15,
  fontWeight: 600,
  color: '#1c1c1e',
  letterSpacing: '-0.3px',
}

const notch = {
  width: 126,
  height: 34,
  background: '#1c1c1e',
  borderRadius: 20,
  position: 'absolute',
  left: '50%',
  top: 8,
  transform: 'translateX(-50%)',
}

const icons = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}
