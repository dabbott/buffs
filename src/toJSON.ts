import path from 'path'
import { DirectoryJSON } from 'memfs'
import { IFS } from 'unionfs/lib/fs'
import { isDirectory } from './utils'
import { visit } from './visit'

export function toJSON(source: IFS, rootPath: string = '/'): DirectoryJSON {
  const result: DirectoryJSON = {}

  visit(source, rootPath, {
    onEnter: (currentPath) => {
      const fullPath = path.join(rootPath, currentPath)

      if (isDirectory(source, fullPath)) return

      result[fullPath] = source.readFileSync(fullPath, 'utf8')
    },
  })

  return result
}
