import { colorById } from '../lib/constants'

export default function ColorDot({ color, size = 18 }) {
  const c = colorById(color)
  return (
    <span
      className="dot"
      title={c ? c.label : 'Sem cor'}
      style={{ width: size, height: size, background: c ? c.hex : 'transparent', borderStyle: c ? 'solid' : 'dashed' }}
    />
  )
}
