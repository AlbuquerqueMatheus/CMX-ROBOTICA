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
}

export const api = isDemo ? demo : real
