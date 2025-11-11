type ColorFn = (s: string) => string

let level = 0

function wrap(code: number): ColorFn {
  const open = `\x1b[${code}m`
  const close = `\x1b[39m`
  return (s: string) => (level > 0 ? `${open}${s}${close}` : s)
}

const colors = {
  get level(): number {
    return level
  },
  set level(v: number) {
    level = v || 0
  },
  green: wrap(32),
  yellow: wrap(33),
  red: wrap(31),
  gray: wrap(90),
}

export default colors

