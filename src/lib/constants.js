export const COLORS = [
  { id: 'amarela', label: 'Amarela', hex: '#facc15' },
  { id: 'vermelha', label: 'Vermelha', hex: '#dc2626' },
  { id: 'branca', label: 'Branca', hex: '#ffffff' },
  { id: 'verde', label: 'Verde', hex: '#16a34a' },
  { id: 'preta', label: 'Preta', hex: '#111111' },
  { id: 'laranja', label: 'Laranja', hex: '#f97316' },
  { id: 'rosa', label: 'Rosa', hex: '#ec4899' },
  { id: 'marrom', label: 'Marrom', hex: '#78350f' },
]

export const ROLES = [
  { id: 'lider', label: 'Líder' },
  { id: 'organizador', label: 'Organizador' },
  { id: 'programador', label: 'Programador' },
  { id: 'construtor', label: 'Construtor' },
]

export const TEAM_NAMES = ['6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B']

export const colorById = (id) => COLORS.find((c) => c.id === id)

export const OWNER_FIELDS = {
  flag_owner: 'Responsável pela bandeira',
  music_owner: 'Responsável pela música',
}

// Extensões de áudio aceitas e o tipo usado ao salvar. O Windows marca .mpeg/.mpg como
// "video/mpeg" (ou deixa sem tipo), então decidimos pelo nome do arquivo.
export const AUDIO_TYPES = {
  mp3: 'audio/mpeg', mpeg: 'audio/mpeg', mpg: 'audio/mpeg', mpga: 'audio/mpeg',
  m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg',
  oga: 'audio/ogg', opus: 'audio/ogg', flac: 'audio/flac', webm: 'audio/webm',
}
export const AUDIO_ACCEPT = 'audio/*,' + Object.keys(AUDIO_TYPES).map((e) => '.' + e).join(',')
export const audioTypeOf = (file) => {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (AUDIO_TYPES[ext]) return AUDIO_TYPES[ext]
  if (file.type.startsWith('audio/')) return file.type
  return null
}

// Quem vai dançar a música. Se o banco ainda não tem a lista (SQL 005 não rodado),
// usa o antigo "responsável pela música".
export const dancersOf = (team) =>
  Array.isArray(team?.music_dancers) ? team.music_dancers : team?.music_owner ? [team.music_owner] : []
