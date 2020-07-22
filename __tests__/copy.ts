import fs from 'fs'
import path from 'path'
import os from 'os'

const { S_IFREG, S_IFDIR } = fs.constants

import { copy, createFs, toJSON } from '../src/index'

const mocksPath = path.join(__dirname, 'mocks')

const simpleMockPath = path.join(mocksPath, 'simple')
const simpleMockTestFilePath = path.join(simpleMockPath, 'test.txt')
const simpleMockTestFileData = fs.readFileSync(simpleMockTestFilePath, 'utf8')

const nestedMockPath = path.join(mocksPath, 'nested')

const executablePath = path.join(mocksPath, 'executable')

describe('Copy', () => {
  test('copies a file from the source (OS) to the target (memory)', () => {
    const target = createFs()

    copy(fs, target, simpleMockPath)

    const json = toJSON(target, '/')

    expect(json).toEqual({
      [simpleMockTestFilePath]: simpleMockTestFileData,
    })
  })

  test('copies a directory from the source (OS) to the target (memory)', () => {
    const target = createFs()

    copy(fs, target, nestedMockPath)

    const json = toJSON(target, '/')

    expect(json).toEqual({
      [path.join(nestedMockPath, 'a.txt')]: 'a',
      [path.join(nestedMockPath, 'b', 'b.txt')]: 'b',
    })
  })

  test('copies a directory to the target at a specified path', () => {
    const source = createFs({
      '/source/a.txt': 'a',
      '/source/b/b.txt': 'b',
    })

    const target = createFs()

    copy(source, target, '/source', '/target')

    const json = toJSON(target, '/')

    expect(json).toEqual({
      '/target/a.txt': 'a',
      '/target/b/b.txt': 'b',
    })
  })

  test('preserves file permissions', () => {
    const targetPath = '/executable'

    const target = createFs()

    // Copy from OS to memfs
    copy(fs, target, executablePath, targetPath)

    const target2 = createFs()

    // Copy from memfs to other memfs
    copy(target, target2, targetPath, targetPath)

    // Sanity check
    expect(fs.statSync(executablePath).mode - S_IFREG).toEqual(0o755)

    expect(target.statSync(targetPath).mode - S_IFREG).toEqual(0o755)

    expect(target2.statSync(targetPath).mode - S_IFREG).toEqual(0o755)
  })

  test('respects the copyPermissions option', () => {
    const targetPath = '/executable'

    const target = createFs()

    // Copy from OS to memfs
    copy(fs, target, executablePath, targetPath, { copyPermissions: false })

    expect(fs.statSync(executablePath).mode - S_IFREG).toEqual(0o755)

    expect(target.statSync(targetPath).mode - S_IFREG).toEqual(0o666)
  })

  test('renames files when copying', () => {
    const source = createFs({
      '/source/a.txt': 'a',
      '/source/b/b.txt': 'b',
    })

    const target = createFs()

    const allArguments: { sourcePath: string; targetPath: string }[] = []

    copy(source, target, '/source', '/target', {
      formatTargetName: (options) => {
        allArguments.push(options)

        const { targetPath } = options
        const ext = path.extname(targetPath)
        const base = path.basename(targetPath, ext)
        return `${base}1${ext}`
      },
    })

    const json = toJSON(target)

    expect(json).toEqual({
      '/target1/a1.txt': 'a',
      '/target1/b1/b1.txt': 'b',
    })

    expect(allArguments).toEqual([
      { sourcePath: '/source', targetPath: '/target' },
      { sourcePath: '/source/a.txt', targetPath: '/target1/a.txt' },
      { sourcePath: '/source/b', targetPath: '/target1/b' },
      { sourcePath: '/source/b/b.txt', targetPath: '/target1/b1/b.txt' },
    ])
  })

  test('filters files when copying', () => {
    const source = createFs({
      '/source/a.txt': 'a',
      '/source/b/b.txt': 'b',
      '/source/c/b.txt': 'c/b',
    })

    const target = createFs()

    const allArguments: { sourcePath: string; targetPath: string }[] = []

    copy(source, target, '/source', '/target', {
      filterPath: (options) => {
        allArguments.push(options)

        return (
          options.sourcePath === '/source' || options.sourcePath.includes('b')
        )
      },
    })

    const json = toJSON(target)

    expect(json).toEqual({
      '/target/b/b.txt': 'b',
    })

    expect(allArguments).toEqual([
      { sourcePath: '/source', targetPath: '/target' },
      { sourcePath: '/source/a.txt', targetPath: '/target/a.txt' },
      { sourcePath: '/source/b', targetPath: '/target/b' },
      { sourcePath: '/source/b/b.txt', targetPath: '/target/b/b.txt' },
      { sourcePath: '/source/c', targetPath: '/target/c' },
    ])
  })

  // Test on both OS and memory fs, since behavior can be different
  describe('Root permissions', () => {
    let tmp = ''

    beforeEach(() => {
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'buffs-'))
    })

    afterEach(() => {
      fs.rmdirSync(tmp, { recursive: true })
    })

    test('copies an empty fs from source (memory) to target (OS)', () => {
      const source = createFs({ foo: '123' })

      expect(source.statSync('/').mode - S_IFDIR).toEqual(0o666)

      const nestedPath = path.join(tmp, 'nested')

      // OS
      copy(source, fs, '/', nestedPath)

      expect(fs.statSync(nestedPath).mode - S_IFDIR).toEqual(0o755)

      // Memory
      const target = createFs({}, tmp)

      copy(source, target, '/', nestedPath)

      expect(target.statSync(nestedPath).mode - S_IFDIR).toEqual(0o777)
    })

    test('respects copyRootPermissions (OS)', () => {
      const source = createFs()

      expect(source.statSync('/').mode - S_IFDIR).toEqual(0o666)

      const nestedPath = path.join(tmp, 'nested')

      // OS
      copy(source, fs, '/', nestedPath, { copyRootDirectoryPermissions: true })

      expect(fs.statSync(nestedPath).mode - S_IFDIR).toEqual(0o666)

      // Memory
      const target = createFs({}, tmp)

      copy(source, target, '/', nestedPath, {
        copyRootDirectoryPermissions: true,
      })

      expect(target.statSync(nestedPath).mode - S_IFDIR).toEqual(0o666)
    })
  })
})
