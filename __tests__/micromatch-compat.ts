import micromatch from 'micromatch'
import { describe, expect, it } from 'vitest'
import { createFs, find, match } from '../src'

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
      'a/**',
    ]

    for (const pat of patterns) {
      const ours = match(fs, '/', { includePatterns: [pat] })
      const candidates = find(fs, '/', { include: () => true })
      const expected = candidates.filter((p) => micromatch.isMatch(p, pat))
      expect([...ours].sort()).toEqual([...expected].sort())
    }
  })

  it('matches identical sets for nested root', () => {
    const fs = createFs({
      'a/b.js': '',
      'a/b/c.js': '',
      'a/x.txt': '',
      'a/.hidden': '',
      '.root': '',
    })

    const patterns = [
      '**/*.js',
      '*.js',
      '**/*',
      '*',
      '*/**',
      '?/*.js',
      '**/.*',
      '.*',
    ]
    for (const pat of patterns) {
      const ours = match(fs, '/a', { includePatterns: [pat] })
      const candidates = find(fs, '/a', { include: () => true })
      const expected = candidates.filter((p) => micromatch.isMatch(p, pat))
      expect([...ours].sort()).toEqual([...expected].sort())
    }
  })

  it('supports character classes and braces', () => {
    const fs = createFs({
      'a/a.js': '',
      'a/b.js': '',
      'a/c.js': '',
      'a/!.js': '',
      'a/-.js': '',
      'a/file1.txt': '',
      'a/file2.txt': '',
      'a/file01.txt': '',
      'a/file02.txt': '',
      'a/file10.txt': '',
      'a/filex.txt': '',
      'a/x/c.js': '',
      'a/y/c.js': '',
    })

    const patterns = [
      'a/[ab].js',
      'a/[!c].js',
      'a/[[:alpha:]].js',
      'a/[[:graph:]].js',
      'a/[[:print:]].js',
      'a/[[:punct:]].js',
      'a/file[[:digit:]].txt',
      'a/file[0-9].txt',
      'a/{x,y}/c.js',
      '{a.js,b.txt}',
      'a/file{1..2}.txt',
      'a/file{01..02}.txt',
      '@(a|b).js',
      '!(c).js',
      '+(b).js',
      '*(b).js',
      '@(x|y)/c.js',
      'a/!(x)/c.js',
      'a/@(x|+(y|z))/c.js',
    ]
    for (const pat of patterns) {
      const root =
        pat.includes('{') ||
        pat.includes('}') ||
        pat.includes('@(') ||
        pat.includes('!(') ||
        pat.includes('+(') ||
        pat.includes('*(')
          ? '/'
          : '/a'
      const ours = match(fs, root, { includePatterns: [pat] })
      const candidates = find(fs, root, { include: () => true })
      const expected = candidates.filter((p) => micromatch.isMatch(p, pat))
      expect([...ours].sort()).toEqual([...expected].sort())
    }
  })
})
