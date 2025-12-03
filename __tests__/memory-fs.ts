import { createFsFromVolume, Volume } from 'memfs'
import { describe, expect, it } from 'vitest'
import { IFS, toJSON } from '../src'
import { createMemoryFs } from '../src/memory-fs'

const initial = {
  'a/a.txt': 'hello',
  'b.txt': 'world',
  empty: null,
}

const root = '/root'

function createPair() {
  const vol = new Volume()
  vol.fromJSON(initial, root)

  return {
    memfs: createFsFromVolume(vol),
    mini: createMemoryFs(initial, root),
  }
}

describe('MemoryFS compatibility', () => {
  it('matches common read operations from memfs', () => {
    const { memfs, mini } = createPair()

    const paths = [root, `${root}/a`, `${root}/a/a.txt`, `${root}/empty`]

    paths.forEach((filePath) => {
      const memStat = memfs.statSync(filePath)
      const miniStat = mini.statSync(filePath)

      expect(miniStat.mode).toEqual(memStat.mode)
      expect(miniStat.isDirectory()).toEqual(memStat.isDirectory())
    })

    expect(mini.readdirSync(root)).toEqual(memfs.readdirSync(root))
    expect(mini.readFileSync(`${root}/a/a.txt`, 'utf8')).toEqual(
      memfs.readFileSync(`${root}/a/a.txt`, 'utf8')
    )
    expect(mini.existsSync(`${root}/missing`)).toEqual(
      memfs.existsSync(`${root}/missing`)
    )
  })

  it('mirrors mutations and permissions updates', () => {
    const { memfs, mini } = createPair()

    memfs.mkdirSync(`${root}/nested/dir`, { recursive: true })
    mini.mkdirSync(`${root}/nested/dir`, { recursive: true })

    memfs.writeFileSync(`${root}/nested/dir/file.txt`, 'data')
    mini.writeFileSync(`${root}/nested/dir/file.txt`, 'data')

    memfs.chmodSync(`${root}/nested/dir/file.txt`, 0o754)
    mini.chmodSync(`${root}/nested/dir/file.txt`, 0o754)

    const memfd = memfs.openSync(`${root}/nested`, 'r')
    const minifd = mini.openSync(`${root}/nested`, 'r')

    memfs.fchmodSync(memfd, 0o711)
    mini.fchmodSync(minifd, 0o711)

    memfs.writeFileSync(`${root}/nested/dir/append.txt`, Buffer.from('first'))
    mini.writeFileSync(`${root}/nested/dir/append.txt`, Buffer.from('first'))

    const mutatedPaths = [
      `${root}/nested`,
      `${root}/nested/dir`,
      `${root}/nested/dir/file.txt`,
      `${root}/nested/dir/append.txt`,
    ]

    mutatedPaths.forEach((p) => {
      expect(mini.statSync(p).mode).toEqual(memfs.statSync(p).mode)
    })

    expect(toJSON(mini, root)).toEqual(toJSON(memfs as IFS, root))
  })
})
