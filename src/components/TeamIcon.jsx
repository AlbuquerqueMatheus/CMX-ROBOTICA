import { colorById } from '../lib/constants'

const ALT = { bandeira: 'Bandeira', danca: 'Dança', musica: 'Música' }

// Ícone da equipe (bandeira, dança ou música) na cor escolhida.
// Sem cor escolhida, mostra o verde apagado.
export default function TeamIcon({ kind, color, size = 24 }) {
  const c = colorById(color)
  return (
    <img className={'team-icon' + (c ? '' : ' none')} src={`/icones/${kind}-${c ? c.id : 'verde'}.webp`}
      width={size} height={size} alt={ALT[kind]} title={c ? `${ALT[kind]} ${c.label.toLowerCase()}` : ALT[kind]}
      draggable="false" />
  )
}
