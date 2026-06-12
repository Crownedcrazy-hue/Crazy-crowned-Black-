import { useState } from 'react'

const INITIAL_MESSAGES = {
  1: [
    { id: 1, from: 'them', text: 'Hola! Necesito un cajero con experiencia para este fin de semana 🔥', time: '16:30' },
    { id: 2, from: 'me', text: 'Entendido, cajero con experiencia. ¿Para cuántas personas?', time: '16:37' },
  ],
  2: [
    { id: 1, from: 'them', text: 'Recientemente vuelto al negocio, ¿tienen disponibilidad?', time: '16:20' },
    { id: 2, from: 'me', text: 'Claro que sí, con gusto te ayudamos.', time: '16:24' },
  ],
  default: [
    { id: 1, from: 'them', text: 'Hola, ¿cómo están?', time: '10:00' },
  ]
}

export default function ChatView({ conversation: c, onBack }) {
  const [messages, setMessages] = useState(
    INITIAL_MESSAGES[c.id] || INITIAL_MESSAGES.default
  )
  const [input, setInput] = useState('')

  function send() {
    if (!input.trim()) return
    const now = new Date()
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
    setMessages(prev => [...prev, { id: Date.now(), from: 'me', text: input.trim(), time }])
    setInput('')
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={container}>
      <div style={header}>
        <button style={backBtn} onClick={onBack}>
          <svg width="9" height="16" viewBox="0 0 9 16" fill="none">
            <path d="M8 1L1 8l7 7" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={backLabel}>Mensajes</span>
        </button>

        <div style={contactInfo}>
          <div style={{ ...avatarSmall, background: c.avatarColor }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
              {c.emoji || c.initials}
            </span>
          </div>
          <div>
            <div style={contactName}>{c.name}</div>
            <div style={contactSub}>
              {c.channel === 'whatsapp' ? '📱 WhatsApp' : '📷 Instagram'}
            </div>
          </div>
        </div>

        <button style={moreBtn}>
          <svg width="5" height="20" viewBox="0 0 5 20" fill="none">
            {[2.5, 10, 17.5].map(cy => (
              <circle key={cy} cx="2.5" cy={cy} r="2" fill="#007aff"/>
            ))}
          </svg>
        </button>
      </div>

      <div style={messageArea}>
        {messages.map(msg => (
          <div key={msg.id} style={msg.from === 'me' ? myBubbleWrap : theirBubbleWrap}>
            <div style={msg.from === 'me' ? myBubble : theirBubble}>
              <span style={msgText}>{msg.text}</span>
              <span style={msgTime}>{msg.time}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={inputArea}>
        <div style={inputRow}>
          <input
            style={textInput}
            placeholder="Mensaje..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            style={sendBtn(!!input.trim())}
            onClick={send}
            disabled={!input.trim()}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9h14M10 3l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

const container = { flex: 1, display: 'flex', flexDirection: 'column', background: '#f2f2f7', overflow: 'hidden' }

const header = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  background: '#fff',
  borderBottom: '1px solid rgba(0,0,0,0.08)',
}

const backBtn = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px 0',
}

const backLabel = { fontSize: 16, color: '#007aff', fontWeight: 400 }

const contactInfo = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
}

const avatarSmall = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const contactName = { fontSize: 14, fontWeight: 600, color: '#1c1c1e', textAlign: 'center' }
const contactSub = { fontSize: 11, color: '#8e8e93', textAlign: 'center' }

const moreBtn = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
}

const messageArea = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const myBubbleWrap = { display: 'flex', justifyContent: 'flex-end' }
const theirBubbleWrap = { display: 'flex', justifyContent: 'flex-start' }

const myBubble = {
  background: '#1c1c1e',
  color: '#fff',
  borderRadius: '18px 18px 4px 18px',
  padding: '10px 14px',
  maxWidth: '75%',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const theirBubble = {
  background: '#fff',
  color: '#1c1c1e',
  borderRadius: '18px 18px 18px 4px',
  padding: '10px 14px',
  maxWidth: '75%',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const msgText = { fontSize: 15, lineHeight: 1.4 }

const msgTime = { fontSize: 10, color: 'rgba(255,255,255,0.5)', alignSelf: 'flex-end' }

const inputArea = {
  background: '#fff',
  borderTop: '1px solid rgba(0,0,0,0.08)',
  padding: '10px 14px 28px',
}

const inputRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#f2f2f7',
  borderRadius: 22,
  padding: '6px 6px 6px 14px',
}

const textInput = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  fontSize: 15,
  color: '#1c1c1e',
  fontFamily: 'inherit',
}

const sendBtn = (enabled) => ({
  width: 34,
  height: 34,
  borderRadius: '50%',
  background: enabled ? '#1c1c1e' : '#c7c7cc',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: enabled ? 'pointer' : 'default',
  transition: 'background 0.15s',
  flexShrink: 0,
})
