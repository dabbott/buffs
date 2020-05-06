import fs from 'fs'
import path from 'path'

import { copy, createFs } from '../src/index'

const mocksPath = path.join(__dirname, 'mocks')

const simpleMockPath = path.join(mocksPath, 'simple')
const simpleMockTestFilePath = path.join(simpleMockPath, 'test.txt')
const simpleMockTestFileData = fs.readFileSync(simpleMockTestFilePath, 'utf8')

const nestedMockPath = path.join(mocksPath, 'nested')

const executablePath = path.join(mocksPath, 'executable')

describe('Copy', () => {
  test('copies a file from the source (OS) to the target (memory)', () => {
    const { volume, fs: target } = createFs()

    copy(fs, target, simpleMockPath)

    const json = volume.toJSON()

    expect(json).toEqual({
      [simpleMockTestFilePath]: simpleMockTestFileData,
    })
  })

  test('copies a directory from the source (OS) to the target (memory)', () => {
    const { volume, fs: target } = createFs()

    copy(fs, target, nestedMockPath)

    const json = volume.toJSON()

    expect(json).toEqual({
      [path.join(nestedMockPath, 'a.txt')]: 'a',
      [path.join(nestedMockPath, 'b', 'b.txt')]: 'b',
    })
  })

  test('copies a directory to the target at a specified path', () => {
    const { fs: source } = createFs({
      '/source/a.txt': 'a',
      '/source/b/b.txt': 'b',
    })

    const { volume, fs: target } = createFs()

    copy(source, target, '/source', '/target')

    const json = volume.toJSON()

    expect(json).toEqual({
      '/target/a.txt': 'a',
      '/target/b/b.txt': 'b',
    })
  })

  test('preserves file permissions', () => {
    const targetPath = '/executable'

    const { fs: target } = createFs()

    // Copy from OS to memfs
    copy(fs, target, executablePath, targetPath)

    const { fs: target2 } = createFs()

    // Copy from memfs to other memfs
    copy(target, target2, targetPath, targetPath)

    // Sanity check
    expect(fs.statSync(executablePath).mode).toEqual(0o100755)

    expect(target.statSync(targetPath).mode).toEqual(0o100755)

    expect(target2.statSync(targetPath).mode).toEqual(0o100755)
  })

  test('renames files when copying', () => {
    const { fs: source } = createFs({
      '/source/a.txt': 'a',
      '/source/b/b.txt': 'b',
    })

    const { volume, fs: target } = createFs()

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

    const json = volume.toJSON()

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
    const { fs: source } = createFs({
      '/source/a.txt': 'a',
      '/source/b/b.txt': 'b',
      '/source/c/b.txt': 'c/b',
    })

    const { volume, fs: target } = createFs()

    const allArguments: { sourcePath: string; targetPath: string }[] = []

    copy(source, target, '/source', '/target', {
      filterPath: (options) => {
        allArguments.push(options)

        return (
          options.sourcePath === '/source' || options.sourcePath.includes('b')
        )
      },
    })

    const json = volume.toJSON()

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
})
