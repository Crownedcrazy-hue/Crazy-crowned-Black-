export default function SearchBar({ value, onChange }) {
  return (
    <div style={wrapper}>
      <div style={inputWrap}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="6.5" cy="6.5" r="5" stroke="#8e8e93" strokeWidth="1.5"/>
          <path d="M10 10l3.5 3.5" stroke="#8e8e93" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          style={inputStyle}
          type="text"
          placeholder="Buscar"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
      <button style={botBtn} aria-label="Asistente">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="10" fill="#e5e5ea"/>
          <circle cx="8" cy="11" r="1.5" fill="#8e8e93"/>
          <circle cx="14" cy="11" r="1.5" fill="#8e8e93"/>
          <path d="M7.5 14.5c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5" stroke="#8e8e93" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          <path d="M7 6.5h8M11 4v2.5" stroke="#8e8e93" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

const wrapper = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 16px 10px',
}

const inputWrap = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#fff',
  borderRadius: 10,
  padding: '8px 12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
}

const inputStyle = {
  flex: 1,
  border: 'none',
  outline: 'none',
  fontSize: 15,
  color: '#1c1c1e',
  background: 'transparent',
  fontFamily: 'inherit',
}

const botBtn = {
  width: 38,
  height: 38,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  cursor: 'pointer',
  background: 'none',
  border: 'none',
}
