import { useEffect, useRef, useState } from 'react'
import { api, isDemo } from './lib/api'
import Login from './components/Login'
import TeamGrid from './components/TeamGrid'
import TeamDetail from './components/TeamDetail'
import History from './components/History'

export default function App() {
  const [user, setUser] = useState(undefined)
  const [teams, setTeams] = useState([])
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState('equipes')
  const [version, setVersion] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getUser().then(setUser)
    return api.onAuthChange(setUser)
  }, [])

  const refresh = async () => {
    try {
      setTeams(await api.listTeams())
      setError('')
    } catch (e) {
      setError('Não foi possível carregar as equipes. ' + (e.message || ''))
    }
  }

  useEffect(() => {
    if (user) refresh()
  }, [user])

  // Tempo real: quando alguém muda algo, recarrega tudo (agrupando avisos próximos).
  const timer = useRef(null)
  useEffect(() => {
    if (!user) return
    const off = api.subscribe(() => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        refresh()
        setVersion((v) => v + 1)
      }, 300)
    })
    return () => { off(); clearTimeout(timer.current) }
  }, [user])

  if (user === undefined) return <div className="center muted">Carregando…</div>
  if (!user) return <Login />

  const team = teams.find((t) => t.id === selected)
  const go = (p) => { setPage(p); setSelected(null) }

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => go('equipes')}>
          <span className="logo">🤖</span> Campeonato de Robótica CMX
        </button>
        <nav className="nav">
          <button className={page === 'equipes' ? 'on' : ''} onClick={() => go('equipes')}>Equipes</button>
          <button className={page === 'historico' ? 'on' : ''} onClick={() => go('historico')}>Histórico</button>
        </nav>
        <div className="user">
          <span className="muted">{user.email}</span>
          <button className="link" onClick={() => api.signOut()}>Sair</button>
        </div>
      </header>
      {isDemo && (
        <div className="banner">
          Modo demonstração: os dados ficam salvos só neste navegador até o banco de dados ser conectado.
        </div>
      )}
      <main className="content">
        {error && <div className="error">{error}</div>}
        {page === 'historico' ? (
          <History teams={teams} version={version} />
        ) : team ? (
          <TeamDetail team={team} teams={teams} version={version} onBack={() => setSelected(null)} onChange={refresh} />
        ) : (
          <TeamGrid teams={teams} onOpen={setSelected} />
        )}
      </main>
    </div>
  )
}
