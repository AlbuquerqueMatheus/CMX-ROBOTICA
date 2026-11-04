import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

const formatSize = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)
const icon = (mime) =>
  mime.startsWith('image/') ? '🖼️' : mime === 'application/pdf' ? '📄' : mime.startsWith('video/') ? '🎬' : '📎'

export default function Files({ teamId, version }) {
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const input = useRef(null)

  const load = async () => {
    try {
      const fresh = await api.listFiles(teamId)
      // Mantém o link antigo de quem já estava na lista, para não interromper o que está tocando.
      setFiles((cur) => fresh.map((x) => ({ ...x, url: cur.find((c) => c.id === x.id)?.url || x.url })))
    } catch (e) { setError('Não foi possível carregar os arquivos. ' + (e.message || '')) }
  }
  useEffect(() => { setFiles([]); load() }, [teamId])
  useEffect(() => { if (version) load() }, [version])

  const upload = async (list) => {
    setError('')
    for (const file of list) {
      if (file.size > 50 * 1024 * 1024) { setError(`"${file.name}" passa de 50 MB.`); continue }
      setBusy(`Enviando "${file.name}"…`)
      try { await api.addFile(teamId, file) } catch (e) { setError(e.message) }
    }
    setBusy('')
    if (input.current) input.current.value = ''
    await load()
  }

  const remove = async (f) => {
    if (!window.confirm(`Remover o arquivo "${f.name}"?`)) return
    try { await api.removeFile(f); await load() } catch (e) { setError(e.message) }
  }

  return (
    <section className="card">
      <div className="section-head">
        <h3>Arquivos</h3>
        <button type="button" className="primary" disabled={!!busy} onClick={() => input.current?.click()}>
          + Adicionar arquivo
        </button>
        <input ref={input} type="file" multiple hidden onChange={(e) => upload([...e.target.files])} />
      </div>
      {error && <div className="error">{error}</div>}
      {busy && <p className="muted">{busy}</p>}
      {files.length === 0 && !busy ? (
        <p className="muted">Nenhum arquivo ainda. Envie PDFs, fotos ou documentos (até 50 MB cada).</p>
      ) : (
        <ul className="files">
          {files.map((f) => (
            <li key={f.id}>
              {f.mime.startsWith('image/') ? (
                <img className="thumb" src={f.url} alt="" />
              ) : (
                <span className="thumb icon">{icon(f.mime)}</span>
              )}
              <div className="file-info">
                <a href={f.url} target="_blank" rel="noreferrer" className="file-name">{f.name}</a>
                <span className="small muted">
                  {formatSize(f.size)} · {new Date(f.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <a className="link" href={f.url} download={f.name}>Baixar</a>
              <button type="button" className="link danger" onClick={() => remove(f)}>Remover</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
