import path from 'path'
import { IFS } from 'unionfs/lib/fs'
import { visit, SKIP } from 'tree-visit'

export type FindOptions = {
  include: (searchPath: string) => boolean
  exclude?: (searchPath: string) => boolean
}

export function find(
  source: IFS,
  searchPath: string,
  options: FindOptions
): string[] {
  const { include, exclude = () => false } = options

  const files: string[] = []

  visit('', {
    onEnter: (currentPath) => {
      if (exclude(currentPath)) return SKIP

      if (include(currentPath)) {
        files.push(currentPath)
      }
    },
    getChildren: (currentPath) => {
      const fullPath = path.join(searchPath, currentPath)

      const stat = source.lstatSync(fullPath)

      if (!stat.isDirectory()) return []

      return source
        .readdirSync(fullPath)
        .map((child) => path.join(currentPath, child))
    },
  })

  return files
}
