import ConversationItem from './ConversationItem'

export default function ConversationList({ conversations, onSelect }) {
  if (conversations.length === 0) {
    return (
      <div style={empty}>
        <span style={{ fontSize: 32 }}>💬</span>
        <p style={{ marginTop: 8, color: '#8e8e93', fontSize: 14 }}>Sin conversaciones</p>
      </div>
    )
  }

  return (
    <div style={list}>
      {conversations.map(c => (
        <ConversationItem key={c.id} conversation={c} onSelect={onSelect} />
      ))}
    </div>
  )
}

const list = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  padding: '0 12px',
}

const empty = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px 0',
}
