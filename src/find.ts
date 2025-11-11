import type { IFS } from './ifs'
import { SKIP, visit } from './visit'

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

  visit(source, searchPath, (currentPath) => {
    if (exclude(currentPath)) return SKIP

    if (include(currentPath)) {
      files.push(currentPath)
    }
  })

  return files
}
