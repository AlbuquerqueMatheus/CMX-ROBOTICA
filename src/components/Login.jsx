import { useState } from 'react'
import { api, isDemo } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.signIn(email.trim(), password)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center">
      <form className="card login" onSubmit={submit}>
        <span className="logo-badge big"><img src="/logo-cmx.png" alt="Colégio CMX Moreira Xavier" /></span>
        <h1>Campeonato de Robótica</h1>
        <p className="muted">Colégio CMX Moreira Xavier · acesso dos professores e da coordenação</p>
        <label>
          E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Senha
          <input type="password" required={!isDemo} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        {isDemo && <p className="muted small">Modo demonstração: qualquer e-mail entra.</p>}
      </form>
    </div>
  )
}
