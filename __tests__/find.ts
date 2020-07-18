import fs from 'fs'
import path from 'path'
import { find, createFs } from '../src/index'

const nestedMockPath = path.join(__dirname, 'mocks', 'nested')

it('finds paths', () => {
  const matches = find(fs, nestedMockPath, {
    include: () => true,
  })

  expect(matches).toEqual(['', 'a.txt', 'b', 'b/b.txt'])
})

it('finds included paths', () => {
  const matches = find(fs, nestedMockPath, {
    include: (currentPath) => currentPath.endsWith('.txt'),
  })

  expect(matches).toEqual(['a.txt', 'b/b.txt'])
})

it('finds non-excluded paths', () => {
  const matches = find(fs, nestedMockPath, {
    include: () => true,
    exclude: (currentPath) => currentPath.endsWith('b'),
  })

  expect(matches).toEqual(['', 'a.txt'])
})

test('finds in-memory paths', () => {
  const { fs: source } = createFs({ 'a/a.txt': '', 'b.txt': '' })

  const matches = find(source, '/', {
    include: (currentPath) => currentPath.endsWith('.txt'),
  })

  expect(matches).toEqual(['a/a.txt', 'b.txt'])
})

test('finds nested in-memory paths', () => {
  const { fs: source } = createFs({ 'a/a.txt': '', 'b.txt': '' })

  const matches = find(source, '/a', {
    include: (currentPath) => currentPath.endsWith('.txt'),
  })

  expect(matches).toEqual(['a.txt'])
})
