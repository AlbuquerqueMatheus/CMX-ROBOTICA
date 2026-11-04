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
