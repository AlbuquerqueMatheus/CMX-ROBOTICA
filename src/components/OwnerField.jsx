import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { OWNER_FIELDS } from '../lib/constants'
import TeamIcon from './TeamIcon'

// Campo "Responsável por…" com botão de salvar. Atualiza sozinho se outra pessoa mudar
// e você não estiver editando.
export default function OwnerField({ team, field, hint, icon, onChange }) {
  const value = team[field] || ''
  const [text, setText] = useState(value)
  const [status, setStatus] = useState('')
  const server = useRef(value)

  useEffect(() => { setText(value); server.current = value }, [team.id])
  useEffect(() => {
    setText((cur) => (cur === server.current ? value : cur))
    server.current = value
  }, [value])

  const dirty = text.trim() !== value

  const save = async (e) => {
    e.preventDefault()
    setStatus('Salvando…')
    try {
      await api.setTeamField(team.id, field, text.trim())
      await onChange()
      setStatus('Salvo!')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus('Não foi possível salvar. ' + (err.message || ''))
    }
  }

  return (
    <form className="owner" onSubmit={save}>
      <label>
        <span className="with-icon">{icon && <TeamIcon kind={icon} color={team.color} size={40} />}{OWNER_FIELDS[field]}</span>
        {hint && <span className="small muted">{hint}</span>}
        <div className="owner-row">
          <input value={text} placeholder="Nome do responsável" onChange={(e) => setText(e.target.value)} />
          <button className="primary" disabled={!dirty}>Salvar</button>
        </div>
      </label>
      {status && <span className="small muted">{status}</span>}
    </form>
  )
}
