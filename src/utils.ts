import { IFS } from 'unionfs/lib/fs'

export function isDirectory(source: IFS, path: string) {
  return source.lstatSync(path).isDirectory()
}
