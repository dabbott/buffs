import { Volume, createFsFromVolume } from 'memfs'
import fs from 'fs'
import path from 'path'
import { Volume as VolumeType } from 'memfs/lib/volume'

import { copy } from '../src/index'
import { IFS } from 'unionfs/lib/fs'

function createFs(): { volume: VolumeType; fs: IFS } {
  const volume = new Volume()
  const memfs = createFsFromVolume(volume)
  return { volume, fs: memfs as any }
}

const mocksPath = path.join(__dirname, 'mocks')

const simpleMockPath = path.join(mocksPath, 'simple')
const simpleMockTestFilePath = path.join(simpleMockPath, 'test.txt')
const simpleMockTestFileData = fs.readFileSync(simpleMockTestFilePath, 'utf8')

const nestedMockPath = path.join(mocksPath, 'nested')

describe('Copy', () => {
  test('copies a file from the OS fs to a memfs', () => {
    const { volume, fs: target } = createFs()

    copy(fs, target, simpleMockPath)

    const json = volume.toJSON()

    expect(json).toEqual({
      [simpleMockTestFilePath]: simpleMockTestFileData,
    })
  })

  test('copies a file tree from the OS fs to a memfs', () => {
    const { volume, fs: target } = createFs()

    copy(fs, target, nestedMockPath)

    const json = volume.toJSON()

    expect(json).toEqual({
      [path.join(nestedMockPath, 'a.txt')]: 'a',
      [path.join(nestedMockPath, 'b', 'b.txt')]: 'b',
    })
  })
})
