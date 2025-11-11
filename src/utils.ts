import type { IFS } from './ifs'

export function isDirectory(source: IFS, path: string) {
  return source.lstatSync(path).isDirectory()
}
