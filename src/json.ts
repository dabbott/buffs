import path from 'path'
import type { IFS } from './ifs'
import { DirectoryBufferJSON, DirectoryJSON, createMemoryFs } from './memory-fs'
import { isDirectory } from './utils'
import { visit } from './visit'

export function toJSON(source: IFS, rootPath: string = '/'): DirectoryJSON {
  const result: DirectoryJSON = {}

  visit(source, rootPath, (currentPath) => {
    const fullPath = path.join(rootPath, currentPath)

    if (isDirectory(source, fullPath)) {
      // Represent empty directories as null
      if (source.readdirSync(fullPath).length === 0) {
        result[fullPath] = null
      }
    } else {
      result[fullPath] = source.readFileSync(fullPath, 'utf8')
    }
  })

  return result
}

export type { DirectoryBufferJSON, DirectoryJSON }

export function fromJSON(
  json: DirectoryBufferJSON,
  rootPath: string = '/'
): IFS {
  // Reuse the MemoryFS machinery so behavior mirrors the default factory.
  return createMemoryFs(json, rootPath)
}
