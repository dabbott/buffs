import { expect, it, test } from 'vitest'
import { createFs, match } from '../src'

test('matches paths', () => {
  const fs = createFs({ 'a/a.txt': '', 'b.txt': '' })

  expect(
    match(fs, '/', {
      includePatterns: ['**/*.txt'],
    })
  ).toEqual(['a/a.txt', 'b.txt'])

  expect(
    match(fs, '/', {
      includePatterns: ['*.txt'],
    })
  ).toEqual(['b.txt'])

  expect(
    match(fs, '/a', {
      includePatterns: ['*.txt'],
    })
  ).toEqual(['a.txt'])
})

it('searches files', () => {
  const fs = createFs({
    a: '',
  })

  const result = match(fs, '/', { includePatterns: ['a'] })

  expect(result).toEqual(['a'])
})

it('searches nested files', () => {
  const fs = createFs({
    'a/b/c': '',
  })

  const result = match(fs, '/', { includePatterns: ['**/c'] })

  expect(result).toEqual(['a/b/c'])
})

it('ignores files', () => {
  const fs = createFs({
    'a/b/c': '',
  })

  const result = match(fs, '/', {
    includePatterns: ['**/c'],
    excludePatterns: ['**/b'],
  })

  expect(result).toEqual([])
})

it('searches multiple files', () => {
  const fs = createFs({
    'a.js': '',
    'b/c.js': '',
  })

  const result = match(fs, '/', { includePatterns: ['*.js'] })

  expect(result).toEqual(['a.js'])
})

it('searches multiple nested files', () => {
  const fs = createFs({
    'a/b.js': '',
    'a/b/c.js': '',
  })

  const result = match(fs, '/a', { includePatterns: ['**/*.js'] })

  expect(result).toEqual(['b/c.js', 'b.js'])
})
