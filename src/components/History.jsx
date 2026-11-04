import { useEffect, useState } from 'react'
import { api } from '../lib/api'

const when = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Lista de alterações. Sem teamId mostra todas, com filtro por equipe; com teamId mostra só as da equipe.
export default function History({ teams = [], teamId, version, limit = 200, compact = false }) {
  const [filter, setFilter] = useState('')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const target = teamId || filter || undefined

  useEffect(() => {
    api.listHistory(target, limit)
      .then((h) => { setItems(h); setError('') })
      .catch((e) => setError('Não foi possível carregar o histórico. ' + (e.message || '')))
  }, [target, version, limit])

  return (
    <section className={compact ? 'card' : ''}>
      <div className="section-head">
        {compact ? <h3>Últimas alterações</h3> : <h2 style={{ margin: 0 }}>Histórico de alterações</h2>}
        {!teamId && (
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Todas as equipes</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      {items.length === 0 ? (
        <p className="muted">Nenhuma alteração registrada ainda.</p>
      ) : (
        <ul className={'history' + (compact ? '' : ' card')}>
          {items.map((h) => (
            <li key={h.id}>
              <div>
                {!teamId && h.team_name && <span className="tag">{h.team_name}</span>} {h.action}
              </div>
              <div className="small muted">
                Alteração feita por <strong>{h.user_email}</strong> · {when(h.created_at)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
