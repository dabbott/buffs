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

      if (isDirectory(source, fullPath)) {
        // Represent empty directories as null
        if (source.readdirSync(fullPath).length === 0) {
          result[fullPath] = null
        }
      } else {
        result[fullPath] = source.readFileSync(fullPath, 'utf8')
      }
    },
  })

  return result
}
