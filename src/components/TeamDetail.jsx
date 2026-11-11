import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { COLORS, ROLES, colorById } from '../lib/constants'
import Songs from './Songs'
import Files from './Files'
import Notes from './Notes'
import History from './History'
import OwnerField from './OwnerField'
import Dancers from './Dancers'
import ResetTeam from './ResetTeam'

export default function TeamDetail({ team, teams, version, onBack, onChange }) {
  const initial = () => Object.fromEntries(ROLES.map((r) => [r.id, team.members.find((m) => m.role === r.id)?.name || '']))
  const [names, setNames] = useState(initial)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const server = useRef(initial())

  useEffect(() => { setNames(initial()); server.current = initial() }, [team.id])

  // Quando outra pessoa altera um nome, atualiza o campo, exceto se você estiver editando ele.
  useEffect(() => {
    const fresh = initial()
    setNames((cur) => Object.fromEntries(ROLES.map((r) =>
      [r.id, cur[r.id] === server.current[r.id] ? fresh[r.id] : cur[r.id]])))
    server.current = fresh
  }, [team.members])

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
        <OwnerField team={team} field="flag_owner" onChange={onChange}
          hint={colorById(team.color) ? `Bandeira ${colorById(team.color).label.toLowerCase()}` : 'Escolha a cor da equipe para definir a bandeira'} />
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

      <Songs teamId={team.id} version={version}>
        <Dancers team={team} onChange={onChange} />
      </Songs>

      <Files teamId={team.id} version={version} />

      <Notes team={team} onChange={onChange} />

      <History teamId={team.id} version={version} limit={10} compact />

      <ResetTeam team={team} onChange={onChange} />
    </div>
  )
}
