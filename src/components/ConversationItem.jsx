export default function ConversationItem({ conversation: c, onSelect }) {
  return (
    <div style={card} onClick={() => onSelect(c)} role="button" tabIndex={0}>
      <div style={avatarWrap}>
        <div style={{ ...avatarCircle, background: c.avatarColor }}>
          <span style={avatarText}>{c.emoji || c.initials}</span>
        </div>
        <div style={channelBadge(c.channel)}>
          {c.channel === 'whatsapp' ? <WhatsAppIcon /> : <InstagramIcon />}
        </div>
        {c.badge && (
          <div style={percentBadge(c.badgeType)}>
            <span style={percentText}>{c.badge}</span>
          </div>
        )}
      </div>

      <div style={content}>
        <div style={topRow}>
          <span style={nameStyle}>{c.name}</span>
          <span style={timeStyle}>{c.time}</span>
        </div>
        <div style={bottomRow}>
          {c.read && (
            <span style={checkStyle}>✓</span>
          )}
          <span style={c.read ? messageRead : messageUnread} numberOfLines={1}>
            {c.lastMessage}
          </span>
          {!c.read && c.badge && c.badgeType === 'count' && (
            <span style={countBadge}>{c.badge}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="6" fill="#25d366"/>
      <path
        d="M6 2.5a3.5 3.5 0 0 1 3.03 5.24l.47 1.76-1.83-.46A3.5 3.5 0 1 1 6 2.5Z"
        fill="white"
      />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect width="12" height="12" rx="3" fill="url(#igGrad)"/>
      <circle cx="6" cy="6" r="2.2" stroke="white" strokeWidth="1.2" fill="none"/>
      <circle cx="9" cy="3" r="0.8" fill="white"/>
      <defs>
        <radialGradient id="igGrad" cx="30%" cy="100%" r="120%">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="40%" stopColor="#fd5949"/>
          <stop offset="70%" stopColor="#d6249f"/>
          <stop offset="100%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
    </svg>
  )
}

const card = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: '#fff',
  borderRadius: 14,
  padding: '12px 14px',
  cursor: 'pointer',
  marginBottom: 4,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  transition: 'background 0.1s',
  userSelect: 'none',
}

const avatarWrap = {
  position: 'relative',
  flexShrink: 0,
  width: 50,
  height: 50,
}

const avatarCircle = {
  width: 50,
  height: 50,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const avatarText = {
  color: '#fff',
  fontSize: 17,
  fontWeight: 600,
  letterSpacing: '-0.5px',
}

const channelBadge = (channel) => ({
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: 18,
  height: 18,
  borderRadius: '50%',
  border: '2px solid #fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: channel === 'whatsapp' ? '#25d366' : 'transparent',
  overflow: 'hidden',
})

const percentBadge = (type) => ({
  position: 'absolute',
  top: -4,
  left: -4,
  background: type === 'percent-negative' ? '#fee2e2' : '#fef9c3',
  borderRadius: 10,
  padding: '2px 5px',
  border: '1.5px solid #fff',
  minWidth: 30,
  textAlign: 'center',
})

const percentText = {
  fontSize: 10,
  fontWeight: 700,
  color: '#92400e',
}

const content = {
  flex: 1,
  minWidth: 0,
}

const topRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 3,
}

const bottomRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 3,
}

const nameStyle = {
  fontSize: 15,
  fontWeight: 600,
  color: '#1c1c1e',
}

const timeStyle = {
  fontSize: 12,
  color: '#8e8e93',
  flexShrink: 0,
}

const checkStyle = {
  color: '#34c759',
  fontSize: 12,
  flexShrink: 0,
}

const messageRead = {
  fontSize: 13,
  color: '#8e8e93',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  display: 'block',
  flex: 1,
}

const messageUnread = {
  fontSize: 13,
  color: '#1c1c1e',
  fontWeight: 500,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  display: 'block',
  flex: 1,
}

const countBadge = {
  background: '#34c759',
  color: '#fff',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 10,
  padding: '1px 6px',
  flexShrink: 0,
  marginLeft: 'auto',
}
