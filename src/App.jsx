import { useEffect, useState } from 'react'
import { api, isDemo } from './lib/api'
import Login from './components/Login'
import TeamGrid from './components/TeamGrid'
import TeamDetail from './components/TeamDetail'

export default function App() {
  const [user, setUser] = useState(undefined)
  const [teams, setTeams] = useState([])
  const [selected, setSelected] = useState(null)
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

  if (user === undefined) return <div className="center muted">Carregando…</div>
  if (!user) return <Login />

  const team = teams.find((t) => t.id === selected)

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setSelected(null)}>
          <span className="logo">🤖</span> Campeonato de Robótica CMX
        </button>
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
        {team ? (
          <TeamDetail team={team} teams={teams} onBack={() => setSelected(null)} onChange={refresh} />
        ) : (
          <TeamGrid teams={teams} onOpen={setSelected} />
        )}
      </main>
    </div>
  )
}
