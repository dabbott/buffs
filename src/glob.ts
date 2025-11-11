// Lightweight glob matcher used at runtime to avoid micromatch dependency.
// Supports:
// - '*' within a path segment (matches any chars except '/')
// - '**' across segments (matches zero or more path segments)

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function segmentToRegex(seg: string): RegExp {
  if (seg === '*') return /^.*$/
  const pattern =
    '^' +
    escapeRegex(seg)
      .replace(/\\\*/g, '.*')
      .replace(/\\\?/g, '.') +
    '$'
  return new RegExp(pattern)
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
        return true
      }
      // try to match next segment at any depth
      for (let skip = 0; si + skip <= slen; skip++) {
        if (matchSegments(pats, parts, pi + 1, si + skip)) return true
      }
      return false
    } else {
      const re = segmentToRegex(p)
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

export function isMatch(path: string, patterns: string[]): boolean {
  // Align with micromatch: empty path doesn't match globs like '**'
  if (path === '' || path === '/') {
    return patterns.some((p) => p === '' || p === '/')
  }
  return patterns.some((pat) => {
    if (pat === '' || pat === '/') return path === '' || path === '/'
    const patSegs = pat.split('/').filter(Boolean)
    const pathSegs = path.split('/').filter(Boolean)
    return matchSegments(patSegs, pathSegs)
  })
}
