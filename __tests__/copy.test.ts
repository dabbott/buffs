import fs from 'fs'
import path from 'path'

import { copy, createFs } from '../src/index'

const mocksPath = path.join(__dirname, 'mocks')

const simpleMockPath = path.join(mocksPath, 'simple')
const simpleMockTestFilePath = path.join(simpleMockPath, 'test.txt')
const simpleMockTestFileData = fs.readFileSync(simpleMockTestFilePath, 'utf8')

const nestedMockPath = path.join(mocksPath, 'nested')

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
    const { volume, fs: target } = createFs()

    copy(fs, target, nestedMockPath, '/test')

    const json = volume.toJSON()

    expect(json).toEqual({
      '/test/a.txt': 'a',
      '/test/b/b.txt': 'b',
    })
  })
})
