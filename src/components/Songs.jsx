import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { AUDIO_ACCEPT, audioTypeOf } from '../lib/constants'
import TeamIcon from './TeamIcon'

const titleFromFile = (name) => name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()

export default function Songs({ teamId, color, version, children }) {
  const [songs, setSongs] = useState([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(null)
  const input = useRef(null)
  const players = useRef({})

  const load = async () => {
    try {
      const fresh = await api.listSongs(teamId)
      // Mantém o link antigo de quem já estava na lista, para não interromper o que está tocando.
      setSongs((cur) => fresh.map((x) => ({ ...x, url: cur.find((c) => c.id === x.id)?.url || x.url })))
    } catch (e) { setError('Não foi possível carregar as músicas. ' + (e.message || '')) }
  }
  useEffect(() => { setSongs([]); setPlaying(null); load() }, [teamId])
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

  const remove = async (song) => {
    if (!window.confirm(`Remover a música "${song.title}"?`)) return
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
        <button type="button" className="primary" disabled={!!busy} onClick={() => input.current?.click()}>
          + Adicionar música
        </button>
        <input ref={input} type="file" accept={AUDIO_ACCEPT} multiple hidden onChange={(e) => upload([...e.target.files])} />
      </div>
      {children}
      {error && <div className="error">{error}</div>}
      {busy && <p className="muted">{busy}</p>}
      {songs.length === 0 && !busy ? (
        <p className="muted">Nenhuma música ainda. Envie arquivos MP3 ou MPEG (até 50 MB cada).</p>
      ) : (
        <ul className="songs">
          {songs.map((s) => (
            <li key={s.id} className={playing === s.id ? 'now' : ''}>
              <div className="song-title"><TeamIcon kind="musica" color={color} size={28} />{s.title}</div>
              <audio controls preload="none" src={s.url}
                ref={(el) => { players.current[s.id] = el }}
                onPlay={() => onPlay(s.id)} onPause={() => setPlaying((p) => (p === s.id ? null : p))} />
              <button type="button" className="link danger" onClick={() => remove(s)}>Remover</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
