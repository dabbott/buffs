export interface StatsLike {
  dev: number
  ino: number
  mode: number
  nlink: number
  uid: number
  gid: number
  rdev: number
  size: number
  blksize: number
  blocks: number
  atimeMs: number
  mtimeMs: number
  ctimeMs: number
  birthtimeMs: number
  atime: Date
  mtime: Date
  ctime: Date
  birthtime: Date
  isFile(): boolean
  isDirectory(): boolean
  isBlockDevice(): boolean
  isCharacterDevice(): boolean
  isSymbolicLink(): boolean
  isFIFO(): boolean
  isSocket(): boolean
  toJSON?(): unknown
}

// Minimal fs-like interface used by this library
// Compatible with Node's fs and memfs implementations
export interface IFS {
  lstatSync(path: string): StatsLike
  statSync(path: string): StatsLike
  readdirSync(path: string): string[]
  readFileSync(path: string): Buffer
  readFileSync(path: string, encoding: 'utf8'): string
  writeFileSync(path: string, data: string | Buffer): void
  mkdirSync(path: string, options?: { recursive?: boolean; mode?: number } | number): void
  chmodSync(path: string, mode: number): void
  fchmodSync(fd: number, mode: number): void
  openSync(path: string, flags: string | number, mode?: number): number
  existsSync(path: string): boolean
}
