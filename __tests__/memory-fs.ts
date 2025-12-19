import { createFsFromVolume, Volume } from 'memfs'
import { describe, expect, it, vi } from 'vitest'
import { IFS, toJSON } from '../src'
import { createMemoryFs, MemoryFS } from '../src/memory-fs'

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
      expect(miniStat.uid).toEqual(memStat.uid)
      expect(miniStat.gid).toEqual(memStat.gid)
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

  it('unlinkSync removes files', () => {
    const { memfs, mini } = createPair()

    memfs.writeFileSync(`${root}/toremove.txt`, 'data')
    mini.writeFileSync(`${root}/toremove.txt`, 'data')

    expect(memfs.existsSync(`${root}/toremove.txt`)).toBe(true)
    expect(mini.existsSync(`${root}/toremove.txt`)).toBe(true)

    memfs.unlinkSync(`${root}/toremove.txt`)
    mini.unlinkSync(`${root}/toremove.txt`)

    expect(memfs.existsSync(`${root}/toremove.txt`)).toBe(false)
    expect(mini.existsSync(`${root}/toremove.txt`)).toBe(false)
  })

  it('unlinkSync throws EISDIR for directories', () => {
    const { memfs, mini } = createPair()

    expect(() => memfs.unlinkSync(`${root}/a`)).toThrow()
    expect(() => mini.unlinkSync(`${root}/a`)).toThrow()
  })

  it('unlinkSync throws ENOENT for missing files', () => {
    const { memfs, mini } = createPair()

    expect(() => memfs.unlinkSync(`${root}/nonexistent`)).toThrow()
    expect(() => mini.unlinkSync(`${root}/nonexistent`)).toThrow()
  })

  it('readlinkSync throws EINVAL for non-symlinks', () => {
    const { memfs, mini } = createPair()

    // Both should throw for regular files
    expect(() => memfs.readlinkSync(`${root}/b.txt`)).toThrow()
    expect(() => mini.readlinkSync(`${root}/b.txt`)).toThrow()

    // Both should throw for directories
    expect(() => memfs.readlinkSync(`${root}/a`)).toThrow()
    expect(() => mini.readlinkSync(`${root}/a`)).toThrow()
  })

  it('readlinkSync throws ENOENT for missing paths', () => {
    const { memfs, mini } = createPair()

    expect(() => memfs.readlinkSync(`${root}/nonexistent`)).toThrow()
    expect(() => mini.readlinkSync(`${root}/nonexistent`)).toThrow()
  })

  it('symlinkSync throws (not supported)', () => {
    const { mini } = createPair()

    // MemoryFS doesn't support symlinks, should throw ENOSYS
    expect(() => mini.symlinkSync(`${root}/b.txt`, `${root}/link`)).toThrow()
  })

  it('reset() clears all files and directories', () => {
    const mini = createMemoryFs(initial, root) as MemoryFS

    expect(mini.existsSync(`${root}/a/a.txt`)).toBe(true)
    expect(mini.existsSync(`${root}/b.txt`)).toBe(true)

    mini.reset()

    expect(mini.existsSync(`${root}/a/a.txt`)).toBe(false)
    expect(mini.existsSync(`${root}/b.txt`)).toBe(false)
    expect(mini.existsSync(root)).toBe(false)
    expect(mini.readdirSync('/')).toEqual([])
  })

  it('writeFileSync handles Uint8Array correctly', () => {
    const mini = new MemoryFS()
    const data = new Uint8Array([80, 65, 67, 75]) // "PACK"

    mini.writeFileSync('/test.bin', data)

    const result = mini.readFileSync('/test.bin')
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.toString('utf8')).toBe('PACK')
    expect(result.length).toBe(4)
  })

  it('writeFileSync does not stringify Uint8Array', () => {
    const mini = new MemoryFS()
    const data = new Uint8Array([80, 65, 67, 75])

    mini.writeFileSync('/test.bin', data)

    const result = mini.readFileSync('/test.bin', 'utf8')
    // Should be "PACK", not "80,65,67,75"
    expect(result).toBe('PACK')
    expect(result).not.toContain(',')
  })

  it('promises.writeFile handles Uint8Array correctly', async () => {
    const mini = new MemoryFS()
    const data = new Uint8Array([72, 69, 76, 76, 79]) // "HELLO"

    await mini.promises.writeFile('/test.bin', data)

    const result = mini.readFileSync('/test.bin', 'utf8')
    expect(result).toBe('HELLO')
  })
})

describe('MemoryFS promises API', () => {
  it('stat returns same result as statSync', async () => {
    const mini = createMemoryFs(initial, root) as MemoryFS

    const syncStat = mini.statSync(`${root}/a/a.txt`)
    const asyncStat = await mini.promises.stat(`${root}/a/a.txt`)

    expect(asyncStat.mode).toEqual(syncStat.mode)
    expect(asyncStat.isFile()).toEqual(syncStat.isFile())
    expect(asyncStat.isDirectory()).toEqual(syncStat.isDirectory())
  })

  it('lstat returns same result as lstatSync', async () => {
    const mini = createMemoryFs(initial, root) as MemoryFS

    const syncStat = mini.lstatSync(`${root}/a`)
    const asyncStat = await mini.promises.lstat(`${root}/a`)

    expect(asyncStat.mode).toEqual(syncStat.mode)
    expect(asyncStat.isDirectory()).toBe(true)
  })

  it('readdir returns same result as readdirSync', async () => {
    const mini = createMemoryFs(initial, root) as MemoryFS

    expect(await mini.promises.readdir(root)).toEqual(mini.readdirSync(root))
  })

  it('readFile returns same result as readFileSync', async () => {
    const mini = createMemoryFs(initial, root) as MemoryFS

    const syncContent = mini.readFileSync(`${root}/a/a.txt`, 'utf8')
    const asyncContent = await mini.promises.readFile(`${root}/a/a.txt`, 'utf8')

    expect(asyncContent).toEqual(syncContent)

    const syncBuffer = mini.readFileSync(`${root}/b.txt`)
    const asyncBuffer = await mini.promises.readFile(`${root}/b.txt`)

    expect(asyncBuffer).toEqual(syncBuffer)
  })

  it('writeFile writes files like writeFileSync', async () => {
    const mini = createMemoryFs(initial, root) as MemoryFS

    await mini.promises.writeFile(`${root}/async.txt`, 'async content')

    expect(mini.readFileSync(`${root}/async.txt`, 'utf8')).toEqual('async content')
  })

  it('mkdir creates directories like mkdirSync', async () => {
    const mini = createMemoryFs(initial, root) as MemoryFS

    await mini.promises.mkdir(`${root}/async/nested`, { recursive: true })

    expect(mini.existsSync(`${root}/async/nested`)).toBe(true)
    expect(mini.statSync(`${root}/async/nested`).isDirectory()).toBe(true)
  })

  it('chmod changes mode like chmodSync', async () => {
    const mini = createMemoryFs(initial, root) as MemoryFS

    await mini.promises.chmod(`${root}/b.txt`, 0o755)

    const stat = mini.statSync(`${root}/b.txt`)
    expect(stat.mode & 0o777).toEqual(0o755)
  })

  it('rmdir removes directories like rmdirSync', async () => {
    const mini = createMemoryFs(initial, root) as MemoryFS

    mini.mkdirSync(`${root}/toremove`)
    expect(mini.existsSync(`${root}/toremove`)).toBe(true)

    await mini.promises.rmdir(`${root}/toremove`)

    expect(mini.existsSync(`${root}/toremove`)).toBe(false)
  })

  it('promises reject on errors', async () => {
    const mini = createMemoryFs(initial, root) as MemoryFS

    await expect(mini.promises.stat(`${root}/nonexistent`)).rejects.toThrow()
    await expect(mini.promises.readFile(`${root}/nonexistent`)).rejects.toThrow()
    await expect(mini.promises.rmdir(`${root}/a`)).rejects.toThrow() // not empty
  })
})

describe('MemoryFS callback API', () => {
  it('stat calls callback with result', () => {
    return new Promise<void>((resolve) => {
      const mini = createMemoryFs(initial, root) as MemoryFS

      mini.stat(`${root}/a/a.txt`, (err, stat) => {
        expect(err).toBeNull()
        expect(stat?.isFile()).toBe(true)
        resolve()
      })
    })
  })

  it('readFile calls callback with data', () => {
    return new Promise<void>((resolve) => {
      const mini = createMemoryFs(initial, root) as MemoryFS

      mini.readFile(`${root}/a/a.txt`, 'utf8', (err, data) => {
        expect(err).toBeNull()
        expect(data).toEqual('hello')
        resolve()
      })
    })
  })

  it('writeFile calls callback on success', () => {
    return new Promise<void>((resolve) => {
      const mini = createMemoryFs(initial, root) as MemoryFS

      mini.writeFile(`${root}/callback.txt`, 'callback content', (err) => {
        expect(err).toBeNull()
        expect(mini.readFileSync(`${root}/callback.txt`, 'utf8')).toEqual('callback content')
        resolve()
      })
    })
  })

  it('callback receives error on failure', () => {
    return new Promise<void>((resolve) => {
      const mini = createMemoryFs(initial, root) as MemoryFS

      mini.stat(`${root}/nonexistent`, (err) => {
        expect(err).not.toBeNull()
        expect(err?.code).toEqual('ENOENT')
        resolve()
      })
    })
  })
})
