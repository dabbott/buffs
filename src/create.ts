import type { IFS } from './ifs'
import { createMemoryFs, type DirectoryJSON } from './memory-fs'

/**
 * Create an in-memory filesystem backed by the lightweight MemoryFS implementation.
 *
 * @param json A map of { filename: value }
 * @param cwd A directory path to prepend to each file path in the `json` map
 */
export function createFs(json: DirectoryJSON = {}, cwd: string = '/'): IFS {
  return createMemoryFs(json, cwd)
}

export { DirectoryJSON }
