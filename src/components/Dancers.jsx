import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { dancersOf } from '../lib/constants'
import TeamIcon from './TeamIcon'

// Lista de quem vai dançar a música. Cada nome adicionado ou removido é salvo na hora,
// e a lista se atualiza sozinha quando outra pessoa mexe.
export default function Dancers({ team, onChange }) {
  const saved = dancersOf(team)
  const key = JSON.stringify(saved)
  const [list, setList] = useState(saved)
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setList(saved) }, [team.id, key])

  const persist = async (next, ok) => {
    const before = list
    setList(next); setBusy(true); setStatus('Salvando…')
    try {
      await api.setDancers(team.id, next)
      await onChange()
      setStatus(ok)
      setTimeout(() => setStatus((s) => (s === ok ? '' : s)), 2000)
      return true
    } catch (err) {
      setList(before)
      setStatus('Não foi possível salvar. ' + (err.message || ''))
      return false
    } finally { setBusy(false) }
  }

  const add = async (e) => {
    e.preventDefault()
    // Aceita vários de uma vez separados por vírgula.
    const names = text.split(',').map((n) => n.trim().replace(/\s+/g, ' ')).filter(Boolean)
    const same = (a, b) => a.toLocaleLowerCase('pt-BR') === b.toLocaleLowerCase('pt-BR')
    const fresh = names.filter((n, i) => names.findIndex((m) => same(m, n)) === i && !list.some((x) => same(x, n)))
    if (!fresh.length) { setStatus(names.length ? 'Esse nome já está na lista.' : ''); return }
    if (await persist([...list, ...fresh], fresh.length > 1 ? 'Nomes adicionados!' : 'Nome adicionado!')) setText('')
  }

  const remove = (name) => persist(list.filter((n) => n !== name), 'Nome removido.')

  return (
    <form className="owner dancers" onSubmit={add}>
      <label className="with-icon" htmlFor={`dancers-${team.id}`}>
        <TeamIcon kind="danca" color={team.color} size={40} />Dançarinos da música{list.length > 0 && ` (${list.length})`}
      </label>
      {list.length === 0 ? (
        <p className="small muted">Ninguém ainda. Adicione os nomes de quem vai dançar.</p>
      ) : (
        <ul className="chips">
          {list.map((n) => (
            <li key={n}>
              {n}
              <button type="button" className="chip-x" disabled={busy} title={`Remover ${n}`}
                aria-label={`Remover ${n}`} onClick={() => remove(n)}>✕</button>
            </li>
          ))}
        </ul>
      )}
      <div className="owner-row">
        <input id={`dancers-${team.id}`} value={text} placeholder="Nome (ou vários, separados por vírgula)"
          onChange={(e) => setText(e.target.value)} />
        <button className="primary" disabled={busy || !text.trim()}>Adicionar</button>
      </div>
      {status && <span className="small muted">{status}</span>}
    </form>
  )
}
