import { IFS } from 'unionfs/lib/fs'
import { isMatch } from 'micromatch'
import { find } from './find'

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
