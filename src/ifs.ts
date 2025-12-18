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

// Callback type for async operations
export type Callback<T> = (err: NodeJS.ErrnoException | null, result?: T) => void
export type VoidCallback = (err: NodeJS.ErrnoException | null) => void

// Callback-based async methods (like fs callback API)
export interface IFSCallbacks {
  lstat(targetPath: string, callback: Callback<StatsLike>): void
  stat(targetPath: string, callback: Callback<StatsLike>): void
  readdir(targetPath: string, callback: Callback<string[]>): void
  readFile(targetPath: string, callback: Callback<Buffer>): void
  readFile(targetPath: string, encoding: 'utf8', callback: Callback<string>): void
  writeFile(targetPath: string, data: string | Buffer, callback: VoidCallback): void
  mkdir(
    targetPath: string,
    options: { recursive?: boolean; mode?: number } | number | undefined,
    callback: VoidCallback
  ): void
  mkdir(targetPath: string, callback: VoidCallback): void
  chmod(targetPath: string, mode: number, callback: VoidCallback): void
  fchmod(fd: number, mode: number, callback: VoidCallback): void
  open(targetPath: string, flags: string | number, callback: Callback<number>): void
  open(
    targetPath: string,
    flags: string | number,
    mode: number,
    callback: Callback<number>
  ): void
  rmdir(targetPath: string, callback: VoidCallback): void
  rmdir(
    targetPath: string,
    options: { recursive?: boolean },
    callback: VoidCallback
  ): void
  unlink(targetPath: string, callback: VoidCallback): void
  readlink(targetPath: string, callback: Callback<string>): void
}

// Promise-based async methods (like fs.promises)
export interface IFSPromises {
  lstat(path: string): Promise<StatsLike>
  stat(path: string): Promise<StatsLike>
  readdir(path: string): Promise<string[]>
  readFile(path: string): Promise<Buffer>
  readFile(path: string, encoding: 'utf8'): Promise<string>
  writeFile(path: string, data: string | Buffer): Promise<void>
  mkdir(path: string, options?: { recursive?: boolean; mode?: number } | number): Promise<void>
  chmod(path: string, mode: number): Promise<void>
  rmdir(path: string, options?: { recursive?: boolean }): Promise<void>
  unlink(path: string): Promise<void>
  readlink(path: string): Promise<string>
}

// Minimal fs-like interface used by this library
// Compatible with Node's fs and memfs implementations
// Only includes sync methods to ensure compatibility
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
  rmdirSync(path: string, options?: { recursive?: boolean }): void
  unlinkSync(path: string): void
  readlinkSync(path: string): string
}
