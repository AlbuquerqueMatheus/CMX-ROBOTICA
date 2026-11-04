import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { COLORS, ROLES } from '../lib/constants'
import Songs from './Songs'
import Files from './Files'
import Notes from './Notes'

export default function TeamDetail({ team, teams, onBack, onChange }) {
  const initial = () => Object.fromEntries(ROLES.map((r) => [r.id, team.members.find((m) => m.role === r.id)?.name || '']))
  const [names, setNames] = useState(initial)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { setNames(initial()) }, [team.id])

  const takenBy = (colorId) => teams.find((t) => t.color === colorId && t.id !== team.id)

  const chooseColor = async (colorId) => {
    setError('')
    try {
      await api.setTeamColor(team.id, team.color === colorId ? null : colorId)
      await onChange()
    } catch (e) {
      setError(e.message)
    }
  }

  const saveMembers = async (e) => {
    e.preventDefault()
    setError('')
    setStatus('Salvando…')
    try {
      for (const r of ROLES) {
        const current = team.members.find((m) => m.role === r.id)?.name || ''
        if (names[r.id].trim() !== current) await api.setMemberName(team.id, r.id, names[r.id].trim())
      }
      await onChange()
      setStatus('Salvo!')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus('')
      setError('Não foi possível salvar. ' + (err.message || ''))
    }
  }

  return (
    <div className="detail">
      <button className="link" onClick={onBack}>← Todas as equipes</button>
      <h2>Equipe {team.name}</h2>
      {error && <div className="error">{error}</div>}

      <section className="card">
        <h3>Cor da equipe</h3>
        <div className="colors">
          {COLORS.map((c) => {
            const other = takenBy(c.id)
            const active = team.color === c.id
            return (
              <button key={c.id} type="button" disabled={!!other}
                className={'swatch' + (active ? ' active' : '')}
                onClick={() => chooseColor(c.id)}
                title={other ? `Já usada pela ${other.name}` : c.label}>
                <span className="dot" style={{ background: c.hex, width: 28, height: 28 }} />
                <span>{c.label}</span>
                {other && <span className="small muted">{other.name}</span>}
              </button>
            )
          })}
        </div>
        <p className="small muted">Cada cor pode ser usada por uma equipe. Clique na cor escolhida de novo para liberar.</p>
      </section>

      <section className="card">
        <h3>Integrantes</h3>
        <form onSubmit={saveMembers} className="members">
          {ROLES.map((r) => (
            <label key={r.id}>
              {r.label}
              <input value={names[r.id]} placeholder="Nome do aluno"
                onChange={(e) => setNames({ ...names, [r.id]: e.target.value })} />
            </label>
          ))}
          <div className="row">
            <button className="primary">Salvar integrantes</button>
            <span className="muted">{status}</span>
          </div>
        </form>
      </section>

      <Songs teamId={team.id} />

      <Files teamId={team.id} />

      <Notes team={team} onChange={onChange} />
    </div>
  )
}
