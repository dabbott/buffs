import { createFsFromVolume, DirectoryJSON, Volume } from 'memfs'
import path from 'path'
import { IFS } from 'unionfs/lib/fs'
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

export type DirectoryBufferJSON = Record<string, string | Buffer | null>

export function fromJSON(
  json: DirectoryBufferJSON,
  rootPath: string = '/'
): IFS {
  const volume = new Volume()
  const fs = createFsFromVolume(volume)

  Object.entries(json).forEach(([key, value]) => {
    const fullPath = path.join(rootPath, key)

    if (value !== null) {
      fs.mkdirpSync(path.dirname(fullPath))
      fs.writeFileSync(fullPath, value)
    } else {
      fs.mkdirpSync(fullPath)
    }
  })

  return fs as any
}
