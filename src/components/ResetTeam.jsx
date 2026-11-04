import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

// Botão "Restaurar equipe ao zero" com confirmação: é preciso digitar o nome da turma.
export default function ResetTeam({ team, onChange }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const input = useRef(null)

  const close = () => { if (!busy) { setOpen(false); setTyped(''); setError('') } }

  useEffect(() => {
    if (!open) return
    input.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy])

  const matches = typed.trim().toUpperCase() === team.name.toUpperCase()

  const confirm = async (e) => {
    e.preventDefault()
    if (!matches) return
    setBusy(true); setError('')
    try {
      await api.resetTeam(team.id)
      await onChange()
      setOpen(false); setTyped(''); setDone(true)
      setTimeout(() => setDone(false), 4000)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card danger-zone">
      <h3>Zona de perigo</h3>
      <p className="muted">
        Apaga tudo da equipe {team.name}: cor, integrantes, responsáveis, anotações, músicas e arquivos.
        O histórico de alterações é mantido.
      </p>
      <button type="button" className="danger-btn" onClick={() => setOpen(true)}>Restaurar equipe ao zero</button>
      {done && <span className="small muted" style={{ marginLeft: 12 }}>Equipe restaurada.</span>}

      {open && (
        <div className="modal-backdrop" onMouseDown={close}>
          <form className="modal card" role="alertdialog" aria-modal="true" aria-labelledby="reset-title"
            onMouseDown={(e) => e.stopPropagation()} onSubmit={confirm}>
            <h3 id="reset-title">⚠️ Tem certeza que quer restaurar a equipe {team.name} ao zero?</h3>
            <p>Isso vai apagar <strong>para sempre</strong>:</p>
            <ul>
              <li>a cor da equipe e os responsáveis pela bandeira e pela música;</li>
              <li>os nomes dos 4 integrantes;</li>
              <li>todas as músicas e todos os arquivos enviados;</li>
              <li>as anotações.</li>
            </ul>
            <p className="muted small">Não dá para desfazer. O histórico de alterações continua guardado.</p>
            <label>
              <span>Para confirmar, digite <code>{team.name}</code> no campo abaixo</span>
              <input ref={input} value={typed} onChange={(e) => setTyped(e.target.value)}
                placeholder={team.name} autoComplete="off" disabled={busy} />
            </label>
            {error && <div className="error">{error}</div>}
            <div className="row modal-actions">
              <button type="button" className="ghost-btn" onClick={close} disabled={busy}>Cancelar</button>
              <button className="danger-btn" disabled={!matches || busy}>
                {busy ? 'Apagando…' : 'Sim, apagar tudo'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
