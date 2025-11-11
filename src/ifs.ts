import type { Stats } from 'fs'

// Minimal fs-like interface used by this library
// Compatible with Node's fs and memfs implementations
export interface IFS {
  lstatSync(path: string): Stats
  statSync(path: string): Stats
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
