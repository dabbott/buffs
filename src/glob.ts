// Lightweight glob matcher used at runtime to avoid micromatch dependency.
// Supports:
// - '*' within a path segment (matches any chars except '/')
// - '**' across segments (matches zero or more path segments)

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function segmentToRegex(seg: string): RegExp {
  const [regexStr] = parseSegment(seg, 0)
  return new RegExp('^' + regexStr + '$')
}

function parseSegment(seg: string, i: number): [string, number] {
  let out = ''
  const L = seg.length
  while (i < L) {
    const ch = seg[i]
    if (ch === '*') {
      if (i + 1 < L && seg[i + 1] === '(') {
        // extglob *(...)
        const [alts, ni] = parseExtglobAlternation(seg, i + 2)
        out += '(?:' + alts + ')*'
        i = ni
      } else {
        out += '.*'
        i++
      }
    } else if (ch === '?') {
      if (i + 1 < L && seg[i + 1] === '(') {
        const [alts, ni] = parseExtglobAlternation(seg, i + 2)
        out += '(?:' + alts + ')?'
        i = ni
      } else {
        out += '.'
        i++
      }
    } else if (ch === '+') {
      if (i + 1 < L && seg[i + 1] === '(') {
        const [alts, ni] = parseExtglobAlternation(seg, i + 2)
        out += '(?:' + alts + ')+'
        i = ni
      } else {
        out += '\\+'
        i++
      }
    } else if (ch === '@') {
      if (i + 1 < L && seg[i + 1] === '(') {
        const [alts, ni] = parseExtglobAlternation(seg, i + 2)
        out += '(?:' + alts + ')'
        i = ni
      } else {
        out += '@'
        i++
      }
    } else if (ch === '!') {
      if (i + 1 < L && seg[i + 1] === '(') {
        const [alts, ni] = parseExtglobAlternation(seg, i + 2)
        out += '(?!^(?:' + alts + ')$).+'
        i = ni
      } else {
        out += '!'
        i++
      }
    } else if (ch === '[') {
      const [cls, ni] = parseCharClass(seg, i)
      out += cls
      i = ni
    } else if (ch === ')') {
      // end of a subpattern, return to caller
      break
    } else if (ch === '\\') {
      if (i + 1 < L) {
        out += escapeRegex(seg[i + 1])
        i += 2
      } else {
        out += '\\'
        i++
      }
    } else {
      out += escapeRegex(ch)
      i++
    }
  }
  return [out, i]
}

function parseExtglobAlternation(seg: string, i: number): [string, number] {
  // parse until matching ')', collecting top-level '|' splits
  let depth = 1
  let buf = ''
  const parts: string[] = []
  while (i < seg.length) {
    const ch = seg[i]
    if (ch === '(') {
      depth++
      buf += '('
      i++
    } else if (ch === ')') {
      depth--
      if (depth === 0) {
        // finalize current part and return
        parts.push(buf)
        const alts = parts.map((p) => parseSegment(p, 0)[0]).join('|')
        return [alts, i + 1]
      }
      buf += ')'
      i++
    } else if (ch === '|' && depth === 1) {
      parts.push(buf)
      buf = ''
      i++
    } else {
      buf += ch
      i++
    }
  }
  // if we reach here, parentheses were unbalanced; treat literally
  return [escapeRegex('@(') + buf, i]
}

function parseCharClass(seg: string, i: number): [string, number] {
  let j = i + 1
  let content = ''
  let negate = false
  if (j < seg.length && (seg[j] === '!' || seg[j] === '^')) {
    negate = true
    j++
  }
  while (j < seg.length && seg[j] !== ']') {
    if (seg[j] === '\\' && j + 1 < seg.length) {
      // keep escapes inside character classes
      content += '\\' + seg[j + 1]
      j += 2
      continue
    }
    if (seg[j] === ']') break
    content += seg[j]
    j++
  }
  if (j >= seg.length) {
    // no closing ], escape literally
    return ['\\[', i + 1]
  }
  // Replace POSIX character classes like [:alnum:]
  const posixMap: Record<string, string> = {
    'alnum': 'A-Za-z0-9',
    'alpha': 'A-Za-z',
    'digit': '0-9',
    'xdigit': 'A-Fa-f0-9',
    'lower': 'a-z',
    'upper': 'A-Z',
    'blank': ' \t',
    'space': '\\s',
    'word': 'A-Za-z0-9_',
    'punct': '!"#$%&\'()*+,\\-./:;<=>?@\\[\\]^_`{|}~',
    'graph': '!-~',
    'print': ' -~',
    'ascii': '\\x00-\\x7F',
    'cntrl': '\\x00-\\x1F\\x7F',
  }
  content = content
    .replace(/\[:\^([a-z]+):\]/g, (_m, name) => '^' + (posixMap[name] || _m))
    .replace(/\[:([a-z]+):\]/g, (_m, name) => posixMap[name] || _m)
  const cls = '[' + (negate ? '^' : '') + content + ']'
  return [cls, j + 1]
}

function matchSegments(pats: string[], parts: string[], pi = 0, si = 0): boolean {
  const plen = pats.length
  const slen = parts.length

  while (pi < plen && si < slen) {
    const p = pats[pi]
    if (p === '**') {
      // collapse consecutive '**'
      while (pi + 1 < plen && pats[pi + 1] === '**') pi++
      if (pi + 1 === plen) {
        // trailing **: require at least one more segment if previous pattern had a wildcard
        // to better align with micromatch behaviour for patterns like '*/**'
        const prev = pi > 0 ? pats[pi - 1] : undefined
        if (prev && /[\*\?]/.test(prev)) {
          return si < slen
        }
        // otherwise allow zero segments (e.g., 'a/**' matches 'a')
        // but do not match dot segments by default
        for (let k = si; k < slen; k++) {
          if (parts[k].startsWith('.')) return false
        }
        return true
      }
      // try to match next segment at any depth
      for (let skip = 0; si + skip <= slen; skip++) {
        // '**' cannot consume segments that start with '.' when dot=false
        let hasDot = false
        for (let k = si; k < si + skip; k++) {
          if (parts[k].startsWith('.')) { hasDot = true; break }
        }
        if (hasDot) continue
        if (matchSegments(pats, parts, pi + 1, si + skip)) return true
      }
      return false
    } else {
      const re = segmentToRegex(p)
      // Do not match dotfiles unless pattern segment explicitly starts with '.'
      if (parts[si].startsWith('.') && !p.startsWith('.')) return false
      if (!re.test(parts[si])) return false
      pi++
      si++
    }
  }

  if (si === slen) {
    for (; pi < plen; pi++) {
      if (pats[pi] !== '**') return false
      // if a trailing '**' remains and previous segment had wildcard, require at least one more path segment
      if (pi === plen - 1) {
        const prev = pi > 0 ? pats[pi - 1] : undefined
        if (prev && /[\*\?]/.test(prev)) {
          return false
        }
      }
    }
    return true
  }
  return false
}

function expandBraces(pattern: string): string[] {
  const results: string[] = []
  // find first top-level {...}
  let i = 0
  while (i < pattern.length) {
    if (pattern[i] === '{') break
    i++
  }
  if (i >= pattern.length) return [pattern]
  let depth = 0
  let j = i
  for (; j < pattern.length; j++) {
    const ch = pattern[j]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) break
    }
  }
  if (depth !== 0) return [pattern]
  const prefix = pattern.slice(0, i)
  const body = pattern.slice(i + 1, j)
  const suffix = pattern.slice(j + 1)
  // range syntax {start..end[..step]}
  const numRange = body.match(/^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/)
  const alphaRange = body.match(/^([a-zA-Z])\.\.([a-zA-Z])(?:\.\.(-?\d+))?$/)
  if (numRange) {
    const a = numRange[1]
    const b = numRange[2]
    // micromatch does not expand zero-padded numeric ranges like {01..10}
    const hasLeadingZero = (s: string) => /^-?0\d+/.test(s)
    if (hasLeadingZero(a) || hasLeadingZero(b)) return [pattern]
    const start = parseInt(a, 10)
    const end = parseInt(b, 10)
    const step = numRange[3] ? parseInt(numRange[3], 10) : (start <= end ? 1 : -1)
    if (step === 0) return [pattern]
    const dir = Math.sign(step)
    if ((dir > 0 && start > end) || (dir < 0 && start < end)) {
      return [pattern]
    }
    for (let v = start; dir > 0 ? v <= end : v >= end; v += step) {
      const s = String(v)
      for (const expanded of expandBraces(prefix + s + suffix)) {
        results.push(expanded)
      }
    }
  } else if (alphaRange) {
    const s = alphaRange[1].charCodeAt(0)
    const e = alphaRange[2].charCodeAt(0)
    const step = alphaRange[3] ? parseInt(alphaRange[3], 10) : (s <= e ? 1 : -1)
    if (step === 0) return [pattern]
    const dir = Math.sign(step)
    if ((dir > 0 && s > e) || (dir < 0 && s < e)) return [pattern]
    for (let c = s; dir > 0 ? c <= e : c >= e; c += step) {
      const ch = String.fromCharCode(c)
      for (const expanded of expandBraces(prefix + ch + suffix)) {
        results.push(expanded)
      }
    }
  } else {
    // split body by top-level commas
    const parts: string[] = []
    let buf = ''
    depth = 0
    for (let k = 0; k < body.length; k++) {
      const ch = body[k]
      if (ch === '{') {
        depth++
        buf += ch
      } else if (ch === '}') {
        depth--
        buf += ch
      } else if (ch === ',' && depth === 0) {
        parts.push(buf)
        buf = ''
      } else {
        buf += ch
      }
    }
    parts.push(buf)
    for (const part of parts) {
      for (const expanded of expandBraces(prefix + part + suffix)) {
        results.push(expanded)
      }
    }
  }
  return results
}

function segmentStartsWithDotAllowed(patternSegment: string): boolean {
  // micromatch: dotfiles require pattern segment to start with '.'
  return patternSegment.startsWith('.')
}

export function isMatch(path: string, patterns: string[]): boolean {
  // Align with micromatch: empty path doesn't match globs like '**'
  if (path === '' || path === '/') {
    return patterns.some((p) => p === '' || p === '/')
  }
  for (const pat of patterns.flatMap(expandBraces)) {
    if (pat === '' || pat === '/') {
      if (path === '' || path === '/') return true
      continue
    }
    const patSegs = pat.split('/').filter(Boolean)
    const pathSegs = path.split('/').filter(Boolean)
    // Enforce dotfile rule at first segment if applicable
    if (pathSegs[0]?.startsWith('.') && patSegs[0] !== '**') {
      if (!segmentStartsWithDotAllowed(patSegs[0] ?? '')) continue
    }
    if (matchSegments(patSegs, pathSegs)) return true
  }
  return false
}
