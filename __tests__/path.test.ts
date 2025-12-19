import nodePath from 'path'
import { expect, test } from 'vitest'
import { path } from '../src/memory-fs'

test('basename', () => {
  expect(path.basename('foo')).toEqual(nodePath.basename('foo'))
  expect(path.basename('bar/foo')).toEqual(nodePath.basename('bar/foo'))
  expect(path.basename('bar/baz/foo')).toEqual(nodePath.basename('bar/baz/foo'))

  expect(path.basename('bar.js', '.js')).toEqual(
    nodePath.basename('bar.js', '.js')
  )
  expect(path.basename('bar.js', '.ts')).toEqual(
    nodePath.basename('bar.js', '.ts')
  )

  expect(path.basename('')).toEqual(nodePath.basename(''))
  expect(path.basename('/')).toEqual(nodePath.basename('/'))
  expect(path.basename('/bar')).toEqual(nodePath.basename('/bar'))
  expect(path.basename('./bar')).toEqual(nodePath.basename('./bar'))
  expect(path.basename('bar/')).toEqual(nodePath.basename('bar/'))
  expect(path.basename('/bar/')).toEqual(nodePath.basename('/bar/'))
})

test('normalize', () => {
  expect(path.normalize('foo')).toEqual(nodePath.normalize('foo'))
  expect(path.normalize('foo/')).toEqual(nodePath.normalize('foo/'))
  expect(path.normalize('/foo')).toEqual(nodePath.normalize('/foo'))
  expect(path.normalize('/foo/')).toEqual(nodePath.normalize('/foo/'))
  expect(path.normalize('/foo/bar')).toEqual(nodePath.normalize('/foo/bar'))
  expect(path.normalize('/foo//bar')).toEqual(nodePath.normalize('/foo//bar'))
  expect(path.normalize('//')).toEqual(nodePath.normalize('//'))
  expect(path.normalize('/////')).toEqual(nodePath.normalize('/////'))
})

test('dirname', () => {
  expect(path.dirname('foo')).toEqual(nodePath.dirname('foo'))
  expect(path.dirname('bar/foo')).toEqual(nodePath.dirname('bar/foo'))
  expect(path.dirname('bar/baz/foo')).toEqual(nodePath.dirname('bar/baz/foo'))
  expect(path.dirname('/foo')).toEqual(nodePath.dirname('/foo'))

  expect(path.dirname('')).toEqual(nodePath.dirname(''))
  expect(path.dirname('/')).toEqual(nodePath.dirname('/'))
  expect(path.dirname('bar/')).toEqual(nodePath.dirname('bar/'))
  expect(path.dirname('/bar/')).toEqual(nodePath.dirname('/bar/'))
})

test('join', () => {
  expect(path.join('foo')).toEqual(nodePath.join('foo'))
  expect(path.join('bar', 'foo')).toEqual(nodePath.join('bar', 'foo'))
  expect(path.join('bar', 'baz', 'foo')).toEqual(
    nodePath.join('bar', 'baz', 'foo')
  )
  expect(path.join('/', 'bar')).toEqual(nodePath.join('/', 'bar'))

  expect(path.join('')).toEqual(nodePath.join(''))
  expect(path.join('/')).toEqual(nodePath.join('/'))
  expect(path.join('/', '/')).toEqual(nodePath.join('/', '/'))
  expect(path.join('bar', '', 'foo')).toEqual(nodePath.join('bar', '', 'foo'))
})

test('extname', () => {
  expect(path.extname('file.txt')).toEqual(nodePath.extname('file.txt'))
  expect(path.extname('file.tar.gz')).toEqual(nodePath.extname('file.tar.gz'))
  expect(path.extname('file')).toEqual(nodePath.extname('file'))
  expect(path.extname('.bashrc')).toEqual(nodePath.extname('.bashrc'))
  expect(path.extname('file.')).toEqual(nodePath.extname('file.'))
  expect(path.extname('/path/to/file.txt')).toEqual(
    nodePath.extname('/path/to/file.txt')
  )
  expect(path.extname('/path/to/.bashrc')).toEqual(
    nodePath.extname('/path/to/.bashrc')
  )
})

test('resolve', () => {
  // Note: our resolve always returns absolute paths from root
  // Node's resolve uses cwd, but for memory-fs we always root at /
  expect(path.resolve('/')).toEqual('/')
  expect(path.resolve('/', 'foo')).toEqual('/foo')
  expect(path.resolve('/', 'foo', 'bar')).toEqual('/foo/bar')
  expect(path.resolve('/', 'foo', '..', 'bar')).toEqual('/bar')
  expect(path.resolve('/', 'foo', '.', 'bar')).toEqual('/foo/bar')
  expect(path.resolve('/foo', 'bar')).toEqual('/foo/bar')
})

test('normalize with trailing . and ..', () => {
  expect(path.normalize('/a/b/.')).toEqual(nodePath.normalize('/a/b/.'))
  expect(path.normalize('/a/b/..')).toEqual(nodePath.normalize('/a/b/..'))
  expect(path.normalize('/a/./b')).toEqual(nodePath.normalize('/a/./b'))
  expect(path.normalize('/a/../b')).toEqual(nodePath.normalize('/a/../b'))
  expect(path.normalize('a/b/./c/../d')).toEqual(
    nodePath.normalize('a/b/./c/../d')
  )
})
