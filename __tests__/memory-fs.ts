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

function serializeStat(stat: ReturnType<IFS['statSync']>) {
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

      mutatedPaths.forEach((p) => {
        expect(serializeStat(mini.statSync(p))).toEqual(
          serializeStat(memfs.statSync(p))
        )
      })

      expect(toJSON(mini, root)).toEqual(toJSON(memfs as IFS, root))
    } finally {
      vi.useRealTimers()
    }
  })

  it('aligns on open flag semantics, timestamps, and errors', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2020-01-01T00:00:00Z'))

    try {
      const { memfs, mini } = createPair()

      // append should not truncate
      memfs.writeFileSync(`${root}/append.txt`, 'one')
      mini.writeFileSync(`${root}/append.txt`, 'one')
      const memAppend = memfs.openSync(`${root}/append.txt`, 'a')
      const miniAppend = mini.openSync(`${root}/append.txt`, 'a')
      memfs.writeFileSync(`${root}/append.txt`, 'two')
      mini.writeFileSync(`${root}/append.txt`, 'two')
      expect(memfs.readFileSync(`${root}/append.txt`, 'utf8')).toEqual(
        mini.readFileSync(`${root}/append.txt`, 'utf8')
      )

      // write should truncate
      memfs.writeFileSync(`${root}/truncate.txt`, 'first')
      mini.writeFileSync(`${root}/truncate.txt`, 'first')
      memfs.openSync(`${root}/truncate.txt`, 'w')
      mini.openSync(`${root}/truncate.txt`, 'w')
      expect(memfs.readFileSync(`${root}/truncate.txt`, 'utf8')).toEqual(
        mini.readFileSync(`${root}/truncate.txt`, 'utf8')
      )

      // ENOENT on r for missing file
      expect(() => memfs.openSync(`${root}/missing.txt`, 'r')).toThrow()
      expect(() => mini.openSync(`${root}/missing.txt`, 'r')).toThrow()

      // EISDIR on write to dir
      expect(() => memfs.openSync(`${root}/a`, 'w')).toThrow()
      expect(() => mini.openSync(`${root}/a`, 'w')).toThrow()

      // chmod error on missing path
      expect(() => memfs.chmodSync(`${root}/nope`, 0o755)).toThrow()
      expect(() => mini.chmodSync(`${root}/nope`, 0o755)).toThrow()

      // mkdir on file
      memfs.writeFileSync(`${root}/file.txt`, 'data')
      mini.writeFileSync(`${root}/file.txt`, 'data')
      expect(() => memfs.mkdirSync(`${root}/file.txt`)).toThrow()
      expect(() => mini.mkdirSync(`${root}/file.txt`)).toThrow()

      // mode defaults
      const memStat = memfs.statSync(`${root}/file.txt`)
      const miniStat = mini.statSync(`${root}/file.txt`)
      expect(memStat.mode).toEqual(miniStat.mode)

      // nlink / ino alignment for small tree
      memfs.mkdirSync(`${root}/links/inner`, { recursive: true })
      mini.mkdirSync(`${root}/links/inner`, { recursive: true })
      const paths = [`${root}/links`, `${root}/links/inner`]
      paths.forEach((p) => {
        expect(serializeStat(mini.statSync(p)).nlink).toEqual(
          serializeStat(memfs.statSync(p)).nlink
        )
      })

      // atime/mtime/ctime after read/write
      memfs.readFileSync(`${root}/a/a.txt`)
      mini.readFileSync(`${root}/a/a.txt`)
      memfs.writeFileSync(`${root}/a/a.txt`, 'mutated')
      mini.writeFileSync(`${root}/a/a.txt`, 'mutated')
      expect(serializeStat(mini.statSync(`${root}/a/a.txt`))).toEqual(
        serializeStat(memfs.statSync(`${root}/a/a.txt`))
      )

      // close fds from append open
      memfs.fchmodSync(memAppend, 0o666)
      mini.fchmodSync(miniAppend, 0o666)
      expect(serializeStat(mini.statSync(`${root}/append.txt`))).toEqual(
        serializeStat(memfs.statSync(`${root}/append.txt`))
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('rmdirSync removes empty directories', () => {
    const { memfs, mini } = createPair()

    memfs.mkdirSync(`${root}/toremove`)
    mini.mkdirSync(`${root}/toremove`)

    expect(memfs.existsSync(`${root}/toremove`)).toBe(true)
    expect(mini.existsSync(`${root}/toremove`)).toBe(true)

    memfs.rmdirSync(`${root}/toremove`)
    mini.rmdirSync(`${root}/toremove`)

    expect(memfs.existsSync(`${root}/toremove`)).toBe(false)
    expect(mini.existsSync(`${root}/toremove`)).toBe(false)
  })

  it('rmdirSync throws ENOTEMPTY for non-empty directories', () => {
    const { memfs, mini } = createPair()

    // /root/a contains a.txt, so it should throw
    expect(() => memfs.rmdirSync(`${root}/a`)).toThrow()
    expect(() => mini.rmdirSync(`${root}/a`)).toThrow()
  })

  it('rmdirSync throws ENOTDIR for files', () => {
    const { memfs, mini } = createPair()

    expect(() => memfs.rmdirSync(`${root}/b.txt`)).toThrow()
    expect(() => mini.rmdirSync(`${root}/b.txt`)).toThrow()
  })

  it('rmdirSync with recursive removes non-empty directories', () => {
    const { memfs, mini } = createPair()

    memfs.mkdirSync(`${root}/deep/nested/dir`, { recursive: true })
    mini.mkdirSync(`${root}/deep/nested/dir`, { recursive: true })
    memfs.writeFileSync(`${root}/deep/nested/file.txt`, 'data')
    mini.writeFileSync(`${root}/deep/nested/file.txt`, 'data')

    memfs.rmdirSync(`${root}/deep`, { recursive: true })
    mini.rmdirSync(`${root}/deep`, { recursive: true })

    expect(memfs.existsSync(`${root}/deep`)).toBe(false)
    expect(mini.existsSync(`${root}/deep`)).toBe(false)
  })
})
