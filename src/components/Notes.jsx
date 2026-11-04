import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function Notes({ team, onChange }) {
  const [text, setText] = useState(team.notes || '')
  const [status, setStatus] = useState('')
  useEffect(() => { setText(team.notes || '') }, [team.id])

  const dirty = text !== (team.notes || '')

  const save = async () => {
    setStatus('Salvando…')
    try {
      await api.setNotes(team.id, text)
      await onChange()
      setStatus('Salvo!')
      setTimeout(() => setStatus(''), 2000)
    } catch (e) {
      setStatus('Não foi possível salvar. ' + (e.message || ''))
    }
  }

  return (
    <section className="card">
      <h3>Anotações</h3>
      <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Observações sobre a equipe: andamento do robô, pendências, avisos…" />
      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" className="primary" disabled={!dirty} onClick={save}>Salvar anotações</button>
        <span className="muted">{status || (dirty ? 'Alterações não salvas' : '')}</span>
      </div>
    </section>
  )
}
