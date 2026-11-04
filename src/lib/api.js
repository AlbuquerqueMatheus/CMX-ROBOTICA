// Camada de dados. Usa o Supabase quando as variáveis de ambiente existem;
// sem elas, roda em "modo demonstração" salvando só neste navegador.
import { createClient } from '@supabase/supabase-js'
import { OWNER_FIELDS, ROLES, TEAM_NAMES, audioTypeOf } from './constants'

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
      .select('id, name, color, notes, flag_owner, music_owner, members(id, role, name)')
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
    // O Supabase usa o tipo do próprio arquivo (o Windows diz "video/mpeg" para .mpeg),
    // então reembalamos o conteúdo com o tipo de áudio certo antes de enviar.
    const type = audioTypeOf(file) || 'audio/mpeg'
    const body = new Blob([file], { type })
    const { error } = await supabase.storage.from('musicas').upload(path, body, { contentType: type })
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
  // Zera a equipe inteira. O banco apaga os registros e devolve os arquivos para remover do armazenamento.
  async resetTeam(teamId) {
    const { data, error } = await supabase.rpc('reset_team', { p_team_id: teamId })
    if (error) throw new Error('Não foi possível restaurar a equipe. ' + error.message)
    for (const bucket of ['musicas', 'arquivos']) {
      const paths = (data || []).filter((r) => r.bucket === bucket).map((r) => r.path)
      if (paths.length) await supabase.storage.from(bucket).remove(paths)
    }
  },
  // Campos de texto simples da equipe (responsáveis).
  async setTeamField(teamId, field, value) {
    if (!OWNER_FIELDS[field]) throw new Error('Campo inválido.')
    const { error } = await supabase.from('teams').update({ [field]: value }).eq('id', teamId)
    if (error) throw error
  },
  async setNotes(teamId, notes) {
    const { error } = await supabase.from('teams').update({ notes }).eq('id', teamId)
    if (error) throw error
  },
  async listFiles(teamId) {
    const { data, error } = await supabase
      .from('files').select('id, name, path, size, mime, created_at')
      .eq('team_id', teamId).order('created_at', { ascending: false })
    if (error) throw error
    if (!data.length) return []
    const { data: signed, error: e2 } = await supabase.storage
      .from('arquivos').createSignedUrls(data.map((f) => f.path), 60 * 60)
    if (e2) throw e2
    return data.map((f, i) => ({ ...f, url: signed[i]?.signedUrl }))
  },
  async addFile(teamId, file) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${teamId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('arquivos').upload(path, file, { contentType: file.type })
    if (error) throw new Error('Falha ao enviar o arquivo. ' + error.message)
    const { error: e2 } = await supabase.from('files')
      .insert({ team_id: teamId, name: file.name, path, size: file.size, mime: file.type })
    if (e2) {
      await supabase.storage.from('arquivos').remove([path])
      throw e2
    }
  },
  async removeFile(f) {
    const { error } = await supabase.from('files').delete().eq('id', f.id)
    if (error) throw error
    await supabase.storage.from('arquivos').remove([f.path])
  },
  async listHistory(teamId, limit = 200) {
    let q = supabase.from('history').select('id, created_at, user_email, team_id, team_name, action')
      .order('created_at', { ascending: false }).limit(limit)
    if (teamId) q = q.eq('team_id', teamId)
    const { data, error } = await q
    if (error) throw error
    return data
  },
  // Chama cb sempre que alguém altera algo no banco.
  subscribe(cb) {
    const channel = supabase.channel('mudancas')
    for (const table of ['teams', 'members', 'songs', 'files', 'history'])
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => cb(table))
    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
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
      notes: '',
      members: ROLES.map((r) => ({ id: `${name}-${r.id}`, role: r.id, name: '' })),
    })),
  }
}
const save = (db) => {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(db)) } catch { /* ignora */ }
}
let listeners = []
let changeListeners = []
const notify = (table) => changeListeners.forEach((l) => l(table))
// Outras abas do mesmo navegador também são avisadas.
try { window.addEventListener('storage', (e) => { if (e.key === DEMO_KEY) notify('teams') }) } catch { /* ignora */ }
const demoLog = (db, teamId, action) => {
  db.history = db.history || []
  db.history.unshift({ id: Date.now() + Math.random(), created_at: new Date().toISOString(),
    user_email: db.user?.email || 'demo', team_id: teamId, team_name: teamId, action })
}
const roleLabel = (r) => ROLES.find((x) => x.id === r)?.label || r
const colorLabel = (c) => c[0].toUpperCase() + c.slice(1)
let demoSongs = []
let demoFiles = []
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
    const team = db.teams.find((t) => t.id === teamId)
    const old = team.color
    team.color = color
    demoLog(db, teamId, !color ? `Removeu a cor ${colorLabel(old)}` : !old ? `Escolheu a cor ${colorLabel(color)}`
      : `Trocou a cor de ${colorLabel(old)} para ${colorLabel(color)}`)
    save(db); notify('teams')
  },
  async setMemberName(teamId, role, name) {
    const db = load()
    const m = db.teams.find((t) => t.id === teamId).members.find((x) => x.role === role)
    const old = m.name
    if (old === name) return
    m.name = name
    demoLog(db, teamId, !name ? `${roleLabel(role)}: removeu "${old}"` : !old ? `${roleLabel(role)}: definiu "${name}"`
      : `${roleLabel(role)}: trocou "${old}" por "${name}"`)
    save(db); notify('members')
  },
  // No modo demonstração as músicas ficam só na memória (somem ao recarregar).
  async listSongs(teamId) { return demoSongs.filter((s) => s.team_id === teamId) },
  async addSong(teamId, file, title) {
    demoSongs.push({ id: crypto.randomUUID(), team_id: teamId, title, path: file.name,
      url: URL.createObjectURL(new Blob([file], { type: audioTypeOf(file) || 'audio/mpeg' })), created_at: new Date().toISOString() })
    const db = load(); demoLog(db, teamId, `Adicionou a música "${title}"`); save(db); notify('songs')
  },
  async removeSong(song) {
    URL.revokeObjectURL(song.url)
    demoSongs = demoSongs.filter((s) => s.id !== song.id)
    const db = load(); demoLog(db, song.team_id, `Removeu a música "${song.title}"`); save(db); notify('songs')
  },
  async resetTeam(teamId) {
    const db = load()
    const team = db.teams.find((t) => t.id === teamId)
    Object.assign(team, { color: null, notes: '', flag_owner: '', music_owner: '' })
    team.members.forEach((m) => { m.name = '' })
    const nSongs = demoSongs.filter((x) => x.team_id === teamId).length
    const nFiles = demoFiles.filter((x) => x.team_id === teamId).length
    demoSongs = demoSongs.filter((x) => x.team_id !== teamId)
    demoFiles = demoFiles.filter((x) => x.team_id !== teamId)
    demoLog(db, teamId, `Restaurou a equipe ao zero (${nSongs} música(s) e ${nFiles} arquivo(s) apagados)`)
    save(db); notify('teams')
  },
  async setTeamField(teamId, field, value) {
    if (!OWNER_FIELDS[field]) throw new Error('Campo inválido.')
    const db = load()
    const team = db.teams.find((t) => t.id === teamId)
    const old = team[field] || ''
    if (old === value) return
    team[field] = value
    const label = OWNER_FIELDS[field]
    demoLog(db, teamId, !value ? `${label}: removeu "${old}"` : !old ? `${label}: definiu "${value}"`
      : `${label}: trocou "${old}" por "${value}"`)
    save(db); notify('teams')
  },
  async setNotes(teamId, notes) {
    const db = load()
    db.teams.find((t) => t.id === teamId).notes = notes
    demoLog(db, teamId, 'Editou as anotações')
    save(db); notify('teams')
  },
  async listFiles(teamId) { return demoFiles.filter((f) => f.team_id === teamId) },
  async addFile(teamId, file) {
    demoFiles.unshift({ id: crypto.randomUUID(), team_id: teamId, name: file.name, path: file.name,
      size: file.size, mime: file.type, url: URL.createObjectURL(file), created_at: new Date().toISOString() })
    const db = load(); demoLog(db, teamId, `Enviou o arquivo "${file.name}"`); save(db); notify('files')
  },
  async removeFile(f) {
    URL.revokeObjectURL(f.url)
    demoFiles = demoFiles.filter((x) => x.id !== f.id)
    const db = load(); demoLog(db, f.team_id, `Removeu o arquivo "${f.name}"`); save(db); notify('files')
  },
  async listHistory(teamId, limit = 200) {
    const h = load().history || []
    return (teamId ? h.filter((x) => x.team_id === teamId) : h).slice(0, limit)
  },
  subscribe(cb) {
    changeListeners.push(cb)
    return () => { changeListeners = changeListeners.filter((l) => l !== cb) }
  },
}

export const api = isDemo ? demo : real
