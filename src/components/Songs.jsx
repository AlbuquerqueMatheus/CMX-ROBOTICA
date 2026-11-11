import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { AUDIO_ACCEPT, audioTypeOf } from '../lib/constants'
import TeamIcon from './TeamIcon'

const titleFromFile = (name) => name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()

// Aceita o link com ou sem "https://".
const normalizeLink = (raw) => {
  const t = raw.trim()
  if (!t) return null
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : 'https://' + t)
    return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.href : null
  } catch { return null }
}
const siteOf = (link) => { try { return new URL(link).hostname.replace(/^www\./, '') } catch { return '' } }

export default function Songs({ teamId, color, version, children }) {
  const [songs, setSongs] = useState([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(null)
  const input = useRef(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const players = useRef({})

  const load = async () => {
    try {
      const fresh = await api.listSongs(teamId)
      // Mantém o link antigo de quem já estava na lista, para não interromper o que está tocando.
      setSongs((cur) => fresh.map((x) => ({ ...x, url: cur.find((c) => c.id === x.id)?.url || x.url })))
    } catch (e) { setError('Não foi possível carregar as músicas. ' + (e.message || '')) }
  }
  useEffect(() => { setSongs([]); setPlaying(null); setLinkOpen(false); load() }, [teamId])
  useEffect(() => { if (version) load() }, [version])

  const upload = async (files) => {
    setError('')
    for (const file of files) {
      if (!audioTypeOf(file)) { setError(`"${file.name}" não é um arquivo de áudio aceito (MP3, MPEG, M4A, WAV, OGG…).`); continue }
      if (file.size > 50 * 1024 * 1024) { setError(`"${file.name}" passa de 50 MB.`); continue }
      setBusy(`Enviando "${file.name}"…`)
      try { await api.addSong(teamId, file, titleFromFile(file.name)) } catch (e) { setError(e.message) }
    }
    setBusy('')
    if (input.current) input.current.value = ''
    await load()
  }

  const addLink = async (e) => {
    e.preventDefault()
    setError('')
    const link = normalizeLink(linkUrl)
    if (!link) { setError('Esse link não parece válido. Cole o endereço completo da música (ex.: https://suno.com/song/...).'); return }
    const title = linkTitle.trim() || siteOf(link)
    setBusy('Salvando link…')
    try {
      await api.addSongLink(teamId, title, link)
      setLinkTitle(''); setLinkUrl(''); setLinkOpen(false)
    } catch (err) { setError(err.message) }
    setBusy('')
    await load()
  }

  const remove = async (song) => {
    if (!window.confirm(song.path ? `Remover a música "${song.title}"?` : `Remover o link da música "${song.title}"?`)) return
    try { await api.removeSong(song); await load() } catch (e) { setError(e.message) }
  }

  // Só uma música toca por vez.
  const onPlay = (id) => {
    Object.entries(players.current).forEach(([k, el]) => { if (k !== id && el) el.pause() })
    setPlaying(id)
  }

  return (
    <section className="card">
      <div className="section-head">
        <h3 className="with-icon"><TeamIcon kind="musica" color={color} size={40} />Músicas</h3>
        <div className="row">
          <button type="button" className="secondary" disabled={!!busy} onClick={() => setLinkOpen((o) => !o)}>
            + Adicionar link
          </button>
          <button type="button" className="primary" disabled={!!busy} onClick={() => input.current?.click()}>
            + Adicionar música
          </button>
        </div>
        <input ref={input} type="file" accept={AUDIO_ACCEPT} multiple hidden onChange={(e) => upload([...e.target.files])} />
      </div>
      {children}
      {linkOpen && (
        <form className="link-form" onSubmit={addLink}>
          <label>
            Link da música
            <input value={linkUrl} autoFocus placeholder="https://suno.com/song/..." onChange={(e) => setLinkUrl(e.target.value)} />
          </label>
          <label>
            Nome da música (opcional)
            <input value={linkTitle} placeholder="Ex.: Hino da equipe" onChange={(e) => setLinkTitle(e.target.value)} />
          </label>
          <div className="row">
            <button className="primary" disabled={!!busy || !linkUrl.trim()}>Salvar link</button>
            <button type="button" className="link" onClick={() => { setLinkOpen(false); setError('') }}>Cancelar</button>
          </div>
        </form>
      )}
      {error && <div className="error">{error}</div>}
      {busy && <p className="muted">{busy}</p>}
      {songs.length === 0 && !busy ? (
        <p className="muted">Nenhuma música ainda. Envie arquivos MP3 ou MPEG (até 50 MB cada) ou adicione o link de uma música.</p>
      ) : (
        <ul className="songs">
          {songs.map((s) => (
            <li key={s.id} className={playing === s.id ? 'now' : ''}>
              <div className="song-title"><TeamIcon kind="musica" color={color} size={28} />{s.title}</div>
              {s.path ? (
                <audio controls preload="none" src={s.url}
                  ref={(el) => { players.current[s.id] = el }}
                  onPlay={() => onPlay(s.id)} onPause={() => setPlaying((p) => (p === s.id ? null : p))} />
              ) : (
                <a className="song-link" href={s.link} target="_blank" rel="noopener noreferrer">
                  Ouvir em {siteOf(s.link)} ↗
                </a>
              )}
              <button type="button" className="link danger" onClick={() => remove(s)}>Remover</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
