import { createFsFromVolume, Volume } from 'memfs'
import { describe, expect, it, vi } from 'vitest'
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
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2020-01-01T00:00:00Z'))

    try {
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

      const serialize = (stat: ReturnType<IFS['statSync']>) => {
        const base =
          typeof (stat as any).toJSON === 'function'
            ? (stat as any).toJSON()
            : {
                dev: stat.dev,
                ino: stat.ino,
                mode: stat.mode,
                nlink: stat.nlink,
                uid: stat.uid,
                gid: stat.gid,
                rdev: stat.rdev,
                size: stat.size,
                blksize: (stat as any).blksize,
                blocks: (stat as any).blocks,
                atimeMs: stat.atimeMs,
                mtimeMs: stat.mtimeMs,
                ctimeMs: stat.ctimeMs,
                birthtimeMs: stat.birthtimeMs,
                atime: stat.atime,
                mtime: stat.mtime,
                ctime: stat.ctime,
                birthtime: stat.birthtime,
              }

        return {
          ...base,
          isDirectory: stat.isDirectory(),
          isFile: stat.isFile(),
        }
      }

      mutatedPaths.forEach((p) => {
        expect(serialize(mini.statSync(p))).toEqual(
          serialize(memfs.statSync(p))
        )
      })

      expect(toJSON(mini, root)).toEqual(toJSON(memfs as IFS, root))
    } finally {
      vi.useRealTimers()
    }
  })
})
