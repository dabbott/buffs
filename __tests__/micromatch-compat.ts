import { describe, it, expect } from 'vitest'
import micromatch from 'micromatch'
import { createFs, match, find } from '../src'

describe('Micromatch compatibility', () => {
  it('matches identical sets for common patterns at root', () => {
    const fs = createFs({
      'a/a.txt': '',
      'a/b/c': '',
      'a/b.js': '',
      'a/b/c.js': '',
      'b.txt': '',
      'a.js': '',
      'readme.md': '',
    })

    const patterns = [
      '*.txt',
      '**/*.txt',
      '**/c',
      '**/*.js',
      '*.js',
      'a/**',
      '**',
      'a/*',
      'a/*/*.js',
      'a/**/c.js',
      'a/?/c.js',
      '**/*',
    ]

    for (const pat of patterns) {
      const ours = match(fs, '/', { includePatterns: [pat] })
      const candidates = find(fs as any, '/', { include: () => true })
      const expected = candidates.filter((p) => micromatch.isMatch(p, pat))
      expect([...ours].sort()).toEqual([...expected].sort())
    }
  })

  it('matches identical sets for nested root', () => {
    const fs = createFs({
      'a/b.js': '',
      'a/b/c.js': '',
      'a/x.txt': '',
    })

    const patterns = ['**/*.js', '*.js', '**/*', '*', '*/**', '?/*.js']
    for (const pat of patterns) {
      const ours = match(fs, '/a', { includePatterns: [pat] })
      const candidates = find(fs as any, '/a', { include: () => true })
      const expected = candidates.filter((p) => micromatch.isMatch(p, pat))
      expect([...ours].sort()).toEqual([...expected].sort())
    }
  })
})
