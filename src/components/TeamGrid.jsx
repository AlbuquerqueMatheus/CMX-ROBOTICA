import { colorById, dancersOf, ROLES } from '../lib/constants'
import ColorDot from './ColorDot'

export default function TeamGrid({ teams, onOpen }) {
  return (
    <>
      <h2>Equipes</h2>
      <div className="grid">
        {teams.map((t) => {
          const filled = t.members.filter((m) => m.name.trim()).length
          const c = colorById(t.color)
          return (
            <button key={t.id} className="card team" onClick={() => onOpen(t.id)}>
              <div className={'team-stripe' + (c ? '' : ' none')} style={c ? { background: c.hex } : undefined} />
              <div className="team-head">
                <span className="team-name">{t.name}</span>
                <ColorDot color={t.color} />
              </div>
              <div className="muted small">{c ? `Equipe ${c.label}` : 'Cor não escolhida'}</div>
              <ul className="mini">
                {ROLES.map((r) => {
                  const m = t.members.find((x) => x.role === r.id)
                  return (
                    <li key={r.id}>
                      <span className="muted">{r.label}:</span> {m?.name || <em className="muted">a definir</em>}
                    </li>
                  )
                })}
              </ul>
              <div className="owners small">
                <div><span className="muted">🚩 Bandeira:</span> {t.flag_owner || <em className="muted">a definir</em>}</div>
                <div><span className="muted">💃 Dançarinos:</span> {dancersOf(t).join(', ') || <em className="muted">a definir</em>}</div>
              </div>
              <div className="small muted">{filled}/4 integrantes</div>
            </button>
          )
        })}
      </div>
    </>
  )
}
