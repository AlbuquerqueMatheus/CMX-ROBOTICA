// Camada de dados. Usa o Supabase quando as variáveis de ambiente existem;
// sem elas, roda em "modo demonstração" salvando só neste navegador.
import { createClient } from '@supabase/supabase-js'
import { ROLES, TEAM_NAMES } from './constants'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isDemo = !url || !key
const supabase = isDemo ? null : createClient(url, key)

const sortTeams = (teams) =>
  [...teams].sort((a, b) => TEAM_NAMES.indexOf(a.name) - TEAM_NAMES.indexOf(b.name))

// ---------- Supabase ----------
const real = {
  async getUser() {
    const { data } = await supabase.auth.getSession()
    return data.session?.user ?? null
  },
  onAuthChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s?.user ?? null))
    return () => data.subscription.unsubscribe()
  },
  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('E-mail ou senha incorretos.')
  },
  async signOut() {
    await supabase.auth.signOut()
  },
  async listTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, color, members(id, role, name)')
    if (error) throw error
    return sortTeams(data)
  },
  async setTeamColor(teamId, color) {
    const { error } = await supabase.from('teams').update({ color }).eq('id', teamId)
    if (error) {
      if (error.code === '23505') throw new Error('Essa cor já foi escolhida por outra equipe.')
      throw error
    }
  },
  async setMemberName(teamId, role, name) {
    const { error } = await supabase
      .from('members')
      .upsert(
        { team_id: teamId, role, name, updated_at: new Date().toISOString() },
        { onConflict: 'team_id,role' },
      )
    if (error) throw error
  },
  async listSongs(teamId) {
    const { data, error } = await supabase
      .from('songs').select('id, title, path, created_at')
      .eq('team_id', teamId).order('created_at')
    if (error) throw error
    if (!data.length) return []
    const { data: signed, error: e2 } = await supabase.storage
      .from('musicas').createSignedUrls(data.map((s) => s.path), 60 * 60)
    if (e2) throw e2
    return data.map((s, i) => ({ ...s, url: signed[i]?.signedUrl }))
  },
  async addSong(teamId, file, title) {
    const ext = (file.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${teamId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('musicas').upload(path, file, { contentType: file.type })
    if (error) throw new Error('Falha ao enviar o arquivo. ' + error.message)
    const { error: e2 } = await supabase.from('songs').insert({ team_id: teamId, title, path })
    if (e2) {
      await supabase.storage.from('musicas').remove([path])
      throw e2
    }
  },
  async removeSong(song) {
    const { error } = await supabase.from('songs').delete().eq('id', song.id)
    if (error) throw error
    await supabase.storage.from('musicas').remove([song.path])
  },
}

// ---------- Demonstração (localStorage) ----------
const DEMO_KEY = 'robotica-demo-v1'
const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(DEMO_KEY))
    if (saved) return saved
  } catch { /* ignora */ }
  return {
    user: null,
    teams: TEAM_NAMES.map((name) => ({
      id: name,
      name,
      color: null,
      members: ROLES.map((r) => ({ id: `${name}-${r.id}`, role: r.id, name: '' })),
    })),
  }
}
const save = (db) => {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(db)) } catch { /* ignora */ }
}
let listeners = []
let demoSongs = []
const demo = {
  async getUser() { return load().user },
  onAuthChange(cb) {
    listeners.push(cb)
    return () => { listeners = listeners.filter((l) => l !== cb) }
  },
  async signIn(email) {
    const db = load(); db.user = { email }; save(db)
    listeners.forEach((l) => l(db.user))
  },
  async signOut() {
    const db = load(); db.user = null; save(db)
    listeners.forEach((l) => l(null))
  },
  async listTeams() { return sortTeams(load().teams) },
  async setTeamColor(teamId, color) {
    const db = load()
    if (color && db.teams.some((t) => t.color === color && t.id !== teamId))
      throw new Error('Essa cor já foi escolhida por outra equipe.')
    db.teams.find((t) => t.id === teamId).color = color
    save(db)
  },
  async setMemberName(teamId, role, name) {
    const db = load()
    db.teams.find((t) => t.id === teamId).members.find((m) => m.role === role).name = name
    save(db)
  },
  // No modo demonstração as músicas ficam só na memória (somem ao recarregar).
  async listSongs(teamId) { return demoSongs.filter((s) => s.team_id === teamId) },
  async addSong(teamId, file, title) {
    demoSongs.push({ id: crypto.randomUUID(), team_id: teamId, title, path: file.name,
      url: URL.createObjectURL(file), created_at: new Date().toISOString() })
  },
  async removeSong(song) {
    URL.revokeObjectURL(song.url)
    demoSongs = demoSongs.filter((s) => s.id !== song.id)
  },
}

export const api = isDemo ? demo : real
