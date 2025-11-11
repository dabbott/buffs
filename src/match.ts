import type { IFS } from './ifs'
import { find } from './find'
import { isMatch } from './glob'

export type MatchOptions = {
  includePatterns: string[]
  excludePatterns?: string[]
}

export function match(
  source: IFS,
  searchPath: string,
  options: MatchOptions
): string[] {
  const { includePatterns, excludePatterns } = options

  return find(source, searchPath, {
    include: (currentPath) => {
      return isMatch(currentPath, includePatterns)
    },

    exclude: (currentPath) => {
      if (!excludePatterns) return false

      return isMatch(currentPath, excludePatterns)
    },
  })
}
