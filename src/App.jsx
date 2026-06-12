import { useState } from 'react'
import StatusBar from './components/StatusBar'
import BrowserBar from './components/BrowserBar'
import FilterTabs from './components/FilterTabs'
import SearchBar from './components/SearchBar'
import ConversationList from './components/ConversationList'
import BottomNav from './components/BottomNav'
import ChatView from './components/ChatView'
import { conversations } from './data/conversations'

export default function App() {
  const [activeTab, setActiveTab] = useState('hacer')
  const [activeNav, setActiveNav] = useState('mensaje')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeChat, setActiveChat] = useState(null)

  const filtered = conversations.filter(c => {
    if (searchQuery) {
      return (
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (activeTab === 'whatsapp') return c.channel === 'whatsapp'
    if (activeTab === 'instagram') return c.channel === 'instagram'
    return true
  })

  if (activeChat) {
    return (
      <div style={phoneShell}>
        <StatusBar />
        <ChatView
          conversation={activeChat}
          onBack={() => setActiveChat(null)}
        />
      </div>
    )
  }

  return (
    <div style={phoneShell}>
      <StatusBar />
      <BrowserBar />
      <div style={scrollArea}>
        <h1 style={headingStyle}>Mensaje</h1>
        <FilterTabs active={activeTab} onChange={setActiveTab} />
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <ConversationList
          conversations={filtered}
          onSelect={setActiveChat}
        />
      </div>
      <BottomNav active={activeNav} onChange={setActiveNav} />
    </div>
  )
}

const phoneShell = {
  width: 390,
  minHeight: 844,
  background: '#f2f2f7',
  borderRadius: 48,
  overflow: 'hidden',
  boxShadow: '0 24px 80px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.15)',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
}

const scrollArea = {
  flex: 1,
  overflowY: 'auto',
  paddingBottom: 8,
}

const headingStyle = {
  textAlign: 'center',
  fontSize: 17,
  fontWeight: 600,
  color: '#1c1c1e',
  padding: '14px 0 10px',
  background: '#f2f2f7',
}
