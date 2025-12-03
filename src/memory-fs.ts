import path from 'path'
import type { IFS, StatsLike } from './ifs'

const S_IFDIR = 0o040000
const S_IFREG = 0o100000
const DEFAULT_DIR_PERMISSIONS = 0o777
const DEFAULT_FILE_PERMISSIONS = 0o666
const DEFAULT_DIR_MODE = S_IFDIR | DEFAULT_DIR_PERMISSIONS
const BLOCK_SIZE = 4096
const O_RDONLY = 0
const O_WRONLY = 1
const O_RDWR = 2
const O_CREAT = 0o100
const O_TRUNC = 0o1000
const O_APPEND = 0o2000

export type DirectoryJSON = Record<string, string | null>
export type DirectoryBufferJSON = Record<string, string | Buffer | null>

type NodeType = 'file' | 'dir'

type Timestamps = {
  atime: Date
  mtime: Date
  ctime: Date
  birthtime: Date
}

type DirectoryNode = {
  type: 'dir'
  ino: number
  children: Map<string, FileSystemNode>
  mode: number
  times: Timestamps
}

type FileNode = {
  type: 'file'
  ino: number
  data: Buffer
  mode: number
  times: Timestamps
}

type FileSystemNode = DirectoryNode | FileNode

function cloneDate(date: Date): Date {
  return new Date(date.getTime())
}

function createTimes(now = new Date()): Timestamps {
  return {
    atime: cloneDate(now),
    mtime: cloneDate(now),
    ctime: cloneDate(now),
    birthtime: cloneDate(now),
  }
}

function applyMode(type: NodeType, mode: number): number {
  const typeBits = type === 'dir' ? S_IFDIR : S_IFREG
  return typeBits | (mode & 0o7777)
}

class MemoryStats implements StatsLike {
  private type: NodeType
  dev = 0
  ino = 0
  mode: number
  nlink: number
  uid: number
  gid: number
  rdev = 0
  size: number
  blksize = BLOCK_SIZE
  blocks = 1
  atimeMs: number
  mtimeMs: number
  ctimeMs: number
  birthtimeMs: number
  atime: Date
  mtime: Date
  ctime: Date
  birthtime: Date

  constructor(
    type: NodeType,
    mode: number,
    size: number,
    times: Timestamps,
    meta: { ino: number; uid: number; gid: number; nlink: number }
  ) {
    this.type = type
    this.mode = mode
    this.size = size
    this.nlink = meta.nlink
    this.ino = meta.ino
    this.uid = meta.uid
    this.gid = meta.gid
    this.atime = cloneDate(times.atime)
    this.mtime = cloneDate(times.mtime)
    this.ctime = cloneDate(times.ctime)
    this.birthtime = cloneDate(times.birthtime)
    this.atimeMs = this.atime.getTime()
    this.mtimeMs = this.mtime.getTime()
    this.ctimeMs = this.ctime.getTime()
    this.birthtimeMs = this.birthtime.getTime()
    this.blocks = Math.max(1, Math.ceil(size / BLOCK_SIZE))
  }

  isFile(): boolean {
    return this.type === 'file'
  }

  isDirectory(): boolean {
    return this.type === 'dir'
  }

  isBlockDevice(): boolean {
    return false
  }

  isCharacterDevice(): boolean {
    return false
  }

  isSymbolicLink(): boolean {
    return false
  }

  isFIFO(): boolean {
    return false
  }

  isSocket(): boolean {
    return false
  }

  toJSON() {
    return {
      dev: this.dev,
      ino: this.ino,
      mode: this.mode,
      nlink: this.nlink,
      uid: this.uid,
      gid: this.gid,
      rdev: this.rdev,
      size: this.size,
      blksize: this.blksize,
      blocks: this.blocks,
      atimeMs: this.atimeMs,
      mtimeMs: this.mtimeMs,
      ctimeMs: this.ctimeMs,
      birthtimeMs: this.birthtimeMs,
      atime: cloneDate(this.atime),
      mtime: cloneDate(this.mtime),
      ctime: cloneDate(this.ctime),
      birthtime: cloneDate(this.birthtime),
    }
  }
}

type ParsedFlags = {
  read: boolean
  write: boolean
  append: boolean
  truncate: boolean
  create: boolean
}

function parseNumberFlags(flags: number): ParsedFlags {
  const accessMode = flags & 3
  const read = accessMode === O_RDONLY || accessMode === O_RDWR
  const write = accessMode === O_WRONLY || accessMode === O_RDWR
  const append = Boolean(flags & O_APPEND)
  const truncate = Boolean(flags & O_TRUNC)
  const create = Boolean(flags & O_CREAT) || append || truncate

  return { read, write, append, truncate, create }
}

function parseFlags(flags: string | number): ParsedFlags {
  if (typeof flags === 'number') {
    return parseNumberFlags(flags)
  }

  switch (flags) {
    case 'r':
      return { read: true, write: false, append: false, truncate: false, create: false }
    case 'r+':
    case 'rs+':
      return { read: true, write: true, append: false, truncate: false, create: false }
    case 'w':
      return { read: false, write: true, append: false, truncate: true, create: true }
    case 'wx':
    case 'xw':
      return { read: false, write: true, append: false, truncate: true, create: true }
    case 'w+':
    case 'wx+':
    case 'xw+':
      return { read: true, write: true, append: false, truncate: true, create: true }
    case 'a':
      return { read: false, write: true, append: true, truncate: false, create: true }
    case 'ax':
    case 'xa':
      return { read: false, write: true, append: true, truncate: false, create: true }
    case 'a+':
    case 'ax+':
    case 'xa+':
      return { read: true, write: true, append: true, truncate: false, create: true }
    default:
      return { read: true, write: false, append: false, truncate: false, create: false }
  }
}

function createErr(code: string, message: string): NodeJS.ErrnoException {
  const error = new Error(message) as NodeJS.ErrnoException
  error.code = code
  return error
}

export class MemoryFS implements IFS {
  private root: DirectoryNode
  private nextFd = 3
  private fds = new Map<number, FileSystemNode>()
  private nextIno = 1
  private uid: number
  private gid: number

  constructor() {
    this.uid = typeof process.getuid === 'function' ? process.getuid() : 0
    this.gid = typeof process.getgid === 'function' ? process.getgid() : 0
    this.root = this.createDirectoryNode(DEFAULT_DIR_MODE)
  }

  private normalize(inputPath: string): string {
    return path.resolve('/', inputPath || '/')
  }

  private allocateIno(): number {
    return this.nextIno++
  }

  private createDirectoryNode(mode: number = DEFAULT_DIR_MODE): DirectoryNode {
    return {
      type: 'dir',
      ino: this.allocateIno(),
      children: new Map(),
      mode,
      times: createTimes(),
    }
  }

  private createFileNode(
    data: Buffer,
    mode: number = DEFAULT_FILE_PERMISSIONS
  ): FileNode {
    return {
      type: 'file',
      ino: this.allocateIno(),
      data,
      mode: applyMode('file', mode),
      times: createTimes(),
    }
  }

  private getNode(targetPath: string): FileSystemNode {
    const normalized = this.normalize(targetPath)

    if (normalized === '/') return this.root

    const parts = normalized.split(path.sep).filter(Boolean)
    let current: FileSystemNode = this.root

    for (const part of parts) {
      if (current.type !== 'dir') {
        throw createErr('ENOENT', `ENOENT: no such file or directory, lstat '${targetPath}'`)
      }

      const next = current.children.get(part)

      if (!next) {
        throw createErr('ENOENT', `ENOENT: no such file or directory, lstat '${targetPath}'`)
      }

      current = next
    }

    return current
  }

  private maybeGetNode(targetPath: string): FileSystemNode | undefined {
    try {
      return this.getNode(targetPath)
    } catch {
      return
    }
  }

  private getDirectory(targetPath: string): DirectoryNode {
    const node = this.getNode(targetPath)

    if (node.type !== 'dir') {
      throw createErr('ENOTDIR', `ENOTDIR: not a directory, scandir '${targetPath}'`)
    }

    return node
  }

  private resolveParent(targetPath: string, recursive: boolean): { parent: DirectoryNode; name: string } {
    const normalized = this.normalize(targetPath)

    if (normalized === '/') {
      return { parent: this.root, name: '' }
    }

    const parts = normalized.split(path.sep).filter(Boolean)
    const name = parts.pop() as string

    let current: DirectoryNode = this.root

    for (const part of parts) {
      const next = current.children.get(part)

      if (!next) {
        if (!recursive) {
          throw createErr('ENOENT', `ENOENT: no such file or directory, mkdir '${targetPath}'`)
        }

        const newDir = this.createDirectoryNode()
        current.children.set(part, newDir)
        current = newDir
      } else {
        if (next.type !== 'dir') {
          throw createErr('ENOTDIR', `ENOTDIR: not a directory, mkdir '${targetPath}'`)
        }

        current = next
      }
    }

    return { parent: current, name }
  }

  private createStats(node: FileSystemNode): StatsLike {
    const size = node.type === 'file' ? node.data.length : 0
    const nlink =
      node.type === 'dir'
        ? 2 +
          [...node.children.values()].filter((child) => child.type === 'dir').length
        : 1

    return new MemoryStats(node.type, node.mode, size, node.times, {
      ino: node.ino,
      uid: this.uid,
      gid: this.gid,
      nlink,
    })
  }

  private touch(node: FileSystemNode): void {
    const now = new Date()
    node.times.mtime = now
    node.times.ctime = now
  }

  lstatSync(targetPath: string): StatsLike {
    return this.createStats(this.getNode(targetPath))
  }

  statSync(targetPath: string): StatsLike {
    return this.lstatSync(targetPath)
  }

  readdirSync(targetPath: string): string[] {
    const dir = this.getDirectory(targetPath)
    return [...dir.children.keys()].sort()
  }

  readFileSync(targetPath: string): Buffer
  readFileSync(targetPath: string, encoding: 'utf8'): string
  readFileSync(targetPath: string, encoding?: BufferEncoding): Buffer | string {
    const node = this.getNode(targetPath)

    if (node.type !== 'file') {
      throw createErr('EISDIR', `EISDIR: illegal operation on a directory, read '${targetPath}'`)
    }

    const data = Buffer.from(node.data)

    return encoding ? data.toString(encoding) : data
  }

  writeFileSync(targetPath: string, data: string | Buffer): void {
    const normalized = this.normalize(targetPath)
    const { parent, name } = this.resolveParent(normalized, false)
    const buffer = Buffer.isBuffer(data) ? Buffer.from(data) : Buffer.from(String(data))

    const existing = parent.children.get(name)

    if (existing && existing.type === 'dir') {
      throw createErr('EISDIR', `EISDIR: illegal operation on a directory, open '${targetPath}'`)
    }

    if (existing && existing.type === 'file') {
      existing.data = buffer
      this.touch(existing)
      return
    }

    parent.children.set(name, this.createFileNode(buffer))
  }

  mkdirSync(
    targetPath: string,
    options?: { recursive?: boolean; mode?: number } | number
  ): void {
    const opts =
      typeof options === 'number' ? { mode: options, recursive: false } : options ?? {}
    const recursive = opts.recursive === true
    const mode = applyMode('dir', opts.mode ?? DEFAULT_DIR_PERMISSIONS)
    const normalized = this.normalize(targetPath)

    if (normalized === '/') {
      return
    }

    const parts = normalized.split(path.sep).filter(Boolean)
    let current: DirectoryNode = this.root

    parts.forEach((part, index) => {
      const last = index === parts.length - 1
      const next = current.children.get(part)

      if (!next) {
        if (!recursive && !last) {
          throw createErr('ENOENT', `ENOENT: no such file or directory, mkdir '${targetPath}'`)
        }

        const newDir = this.createDirectoryNode(last ? mode : DEFAULT_DIR_MODE)
        current.children.set(part, newDir)
        current = newDir
      } else {
        if (next.type !== 'dir') {
          throw createErr('EEXIST', `EEXIST: file already exists, mkdir '${targetPath}'`)
        }

        current = next

        if (last && !recursive) {
          throw createErr('EEXIST', `EEXIST: file already exists, mkdir '${targetPath}'`)
        }
      }
    })
  }

  chmodSync(targetPath: string, mode: number): void {
    const node = this.getNode(targetPath)
    node.mode = applyMode(node.type, mode)
    this.touch(node)
  }

  fchmodSync(fd: number, mode: number): void {
    const node = this.fds.get(fd)

    if (!node) {
      throw createErr('EBADF', `EBADF: bad file descriptor, fchmod`)
    }

    node.mode = applyMode(node.type, mode)
    this.touch(node)
  }

  openSync(targetPath: string, flags: string | number, mode?: number): number {
    const normalized = this.normalize(targetPath)
    const parsed = parseFlags(flags)
    let node = this.maybeGetNode(normalized)

    if (!node) {
      if (!parsed.create && !parsed.write && !parsed.append) {
        throw createErr('ENOENT', `ENOENT: no such file or directory, open '${targetPath}'`)
      }

      const { parent, name } = this.resolveParent(normalized, false)
      node = this.createFileNode(Buffer.alloc(0), mode ?? DEFAULT_FILE_PERMISSIONS)
      parent.children.set(name, node)
    }

    if (node.type === 'dir' && (parsed.write || parsed.append || parsed.truncate)) {
      throw createErr('EISDIR', `EISDIR: illegal operation on a directory, open '${targetPath}'`)
    }

    if (node.type === 'file' && parsed.truncate && !parsed.append) {
      node.data = Buffer.alloc(0)
      this.touch(node)
    }

    const fd = this.nextFd++
    this.fds.set(fd, node)
    return fd
  }

  existsSync(targetPath: string): boolean {
    return Boolean(this.maybeGetNode(targetPath))
  }
}

export function createMemoryFs(
  json: DirectoryBufferJSON = {},
  rootPath: string = '/'
): IFS {
  const memory = new MemoryFS()

  Object.entries(json).forEach(([key, value]) => {
    const fullPath = path.join(rootPath, key)
    const parentPath = path.dirname(fullPath)

    memory.mkdirSync(parentPath, { recursive: true })

    if (value === null) {
      memory.mkdirSync(fullPath, { recursive: true })
    } else {
      memory.writeFileSync(fullPath, value)
    }
  })

  return memory
}
