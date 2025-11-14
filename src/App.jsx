import { useEffect, useMemo, useRef, useState } from 'react'

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

async function http(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return res.json()
}

const api = {
  createUser: (username, avatar_color) => http('/users', { method: 'POST', body: JSON.stringify({ username, avatar_color }) }),
  listUsers: () => http('/users'),
  startConversation: (user_a, user_b) => http('/conversations', { method: 'POST', body: JSON.stringify({ user_a, user_b }) }),
  myConversations: (user_id) => http(`/conversations/${user_id}`),
  sendMessage: (conversation_id, sender_id, text) => http('/messages', { method: 'POST', body: JSON.stringify({ conversation_id, sender_id, text }) }),
  listMessages: (conversation_id, limit = 50, before) => {
    const qs = new URLSearchParams({ limit: String(limit) })
    if (before) qs.set('before', before)
    return http(`/messages/${conversation_id}?${qs.toString()}`)
  },
}

function Avatar({ name, color, size = 40 }) {
  const initials = (name || '?').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()
  return (
    <div className="rounded-full flex items-center justify-center text-white font-semibold shadow" style={{ backgroundColor: color, width: size, height: size }}>
      <span>{initials}</span>
    </div>
  )
}

function Header({ title, subtitle, onBack }) {
  return (
    <div className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-gray-200">
      <div className="px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <div>
          <div className="text-lg font-semibold text-gray-900">{title}</div>
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ mine, text, avatarColor }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} w-full`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${mine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'}`}>
        {text}
      </div>
    </div>
  )
}

function InputBar({ onSend, disabled }) {
  const [text, setText] = useState('')
  const inputRef = useRef(null)

  const send = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
    inputRef.current?.focus()
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="p-3 border-t border-gray-200 bg-white/80 backdrop-blur sticky bottom-0">
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type a message"
          rows={1}
          className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
          disabled={disabled}
        />
        <button onClick={send} disabled={disabled} className={`px-4 py-2 rounded-full text-white font-medium shadow transition ${disabled ? 'bg-gray-300' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}>
          Send
        </button>
      </div>
    </div>
  )
}

function useLocalUser() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chat_user') || 'null') } catch { return null }
  })
  const save = (u) => {
    setUser(u)
    localStorage.setItem('chat_user', JSON.stringify(u))
  }
  return [user, save]
}

function Onboard({ onDone }) {
  const [username, setUsername] = useState('')
  const [color, setColor] = useState('#6366F1')
  const [loading, setLoading] = useState(false)
  const colors = ['#6366F1','#10B981','#F59E0B','#EF4444','#06B6D4','#8B5CF6','#84CC16']

  const create = async () => {
    if (!username.trim()) return
    setLoading(true)
    try {
      const user = await api.createUser(username.trim(), color)
      onDone(user)
    } catch (e) {
      alert('Could not create user. Make sure backend is running.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-50 p-6">
      <div className="w-full max-w-sm bg-white/70 backdrop-blur rounded-3xl shadow-xl border border-white p-6">
        <div className="flex flex-col items-center gap-4">
          <Avatar name={username || 'You'} color={color} size={64} />
          <h1 className="text-xl font-semibold text-gray-900">Create your profile</h1>
          <input
            value={username}
            onChange={(e)=>setUsername(e.target.value)}
            placeholder="Username"
            className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="w-full">
            <div className="text-sm text-gray-600 mb-2">Choose a color</div>
            <div className="grid grid-cols-7 gap-2">
              {colors.map(c => (
                <button key={c} onClick={()=>setColor(c)} className={`h-8 rounded-full border ${color===c?'ring-2 ring-offset-2 ring-indigo-500':'border-gray-300'}`} style={{background:c}} />
              ))}
            </div>
          </div>
          <button onClick={create} disabled={loading || !username.trim()} className={`w-full rounded-xl py-2 text-white font-medium shadow-md transition ${(!username.trim()||loading) ? 'bg-gray-300' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}>
            {loading ? 'Creating...' : 'Continue'}
          </button>
          <div className="text-xs text-gray-500">Server: {BASE_URL}</div>
        </div>
      </div>
    </div>
  )
}

function PeopleList({ me, onPick }) {
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let on = true
    api.listUsers().then(list => {
      if (!on) return
      setPeople(list.filter(p => p.id !== me.id))
      setLoading(false)
    }).catch(err => { setError('Failed to load people'); setLoading(false) })
    return () => { on = false }
  }, [me.id])

  return (
    <div className="flex-1 overflow-y-auto p-2 divide-y">
      {loading && <div className="p-4 text-center text-gray-500">Loading…</div>}
      {error && <div className="p-4 text-center text-red-600">{error}</div>}
      {!loading && people.length === 0 && (
        <div className="p-8 text-center text-gray-500">No other users yet. Open this app in another tab and create a user to start a chat.</div>
      )}
      {people.map(u => (
        <button key={u.id} onClick={() => onPick(u)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 active:scale-[.99] transition">
          <Avatar name={u.username} color={u.avatar_color} />
          <div className="text-left">
            <div className="font-medium text-gray-900">{u.username}</div>
            <div className="text-xs text-gray-500">Tap to chat</div>
          </div>
        </button>
      ))}
    </div>
  )
}

function ChatView({ me, peer, conversation, onBack }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const listRef = useRef(null)

  const load = async () => {
    const msgs = await api.listMessages(conversation.id, 100)
    setMessages(msgs)
    setLoading(false)
    setTimeout(()=> listRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 50)
  }

  useEffect(() => { load() // initial
    const iv = setInterval(load, 2000) // simple polling
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id])

  const send = async (text) => {
    const optimistic = { id: `tmp-${Date.now()}`, text, sender_id: me.id, conversation_id: conversation.id }
    setMessages(prev => [...prev, optimistic])
    setTimeout(()=> listRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 10)
    try {
      const sent = await api.sendMessage(conversation.id, me.id, text)
      setMessages(prev => prev.map(m => m.id === optimistic.id ? sent : m))
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      alert('Failed to send')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={peer.username} subtitle="1 • 1" onBack={onBack} />
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 bg-gradient-to-b from-white to-indigo-50">
        {loading && <div className="p-4 text-center text-gray-500">Loading messages…</div>}
        {messages.map(m => (
          <div key={m.id} className="py-1">
            <MessageBubble mine={m.sender_id === me.id} text={m.text} avatarColor={m.sender_id === me.id ? me.avatar_color : peer.avatar_color} />
          </div>
        ))}
      </div>
      <InputBar onSend={send} />
    </div>
  )
}

function Home({ me, onOpenChat }) {
  const [conversations, setConversations] = useState([])

  useEffect(() => {
    let on = true
    const load = () => api.myConversations(me.id).then(cs => { if(on) setConversations(cs) })
    load()
    const iv = setInterval(load, 3000)
    return () => { on = false; clearInterval(iv) }
  }, [me.id])

  const [stage, setStage] = useState('list') // list | new
  const [picked, setPicked] = useState(null)
  const [activeConv, setActiveConv] = useState(null)

  const openWith = async (peer) => {
    setPicked(peer)
    try {
      const conv = await api.startConversation(me.id, peer.id)
      setActiveConv({ peer, conv })
      setStage('chat')
    } catch (e) {
      alert('Could not open conversation')
    }
  }

  if (stage === 'chat' && activeConv) {
    return <ChatView me={me} peer={activeConv.peer} conversation={activeConv.conv} onBack={() => setStage('list')} />
  }

  if (stage === 'new') {
    return (
      <div className="flex flex-col h-full">
        <Header title="New message" onBack={() => setStage('list')} />
        <PeopleList me={me} onPick={openWith} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Chats" subtitle={me.username} />
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No conversations yet. Start one!</div>
        ) : (
          <div className="divide-y">
            {conversations.map(c => {
              const peerId = c.participant_ids.find(id => id !== me.id)
              return (
                <button key={c.id} onClick={async () => {
                  // Fetch peer and open
                  const users = await api.listUsers()
                  const peer = users.find(u => u.id === peerId)
                  if (!peer) return alert('Peer not found')
                  setActiveConv({ peer, conv: c })
                  setStage('chat')
                }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left">
                  <Avatar name={me.username} color={me.avatar_color} />
                  <div>
                    <div className="font-medium text-gray-900">Conversation</div>
                    <div className="text-xs text-gray-500 truncate max-w-[220px]">{c.last_message_preview || 'No messages yet'}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
      <div className="p-4">
        <button onClick={() => setStage('new')} className="w-full rounded-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-medium shadow-lg">New message</button>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useLocalUser()

  if (!user) return <Onboard onDone={setUser} />

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-sky-100 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md h-[88vh] bg-white/80 backdrop-blur rounded-[2rem] shadow-2xl border border-white overflow-hidden flex flex-col">
        <Home me={user} />
      </div>
    </div>
  )
}
