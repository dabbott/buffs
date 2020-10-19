import { createFsFromVolume, DirectoryJSON, Volume } from 'memfs'
import { IFS } from 'unionfs/lib/fs'
import { fromJSON } from './json'

/**
 * Create an in-memory filesystem.
 *
 * This is a wrapper around memfs (https://github.com/streamich/memfs).
 *
 * @param json A map of { filename: value }
 * @param cwd A directory path to prepend to each file path in the `json` map
 */
export function createFs(json: DirectoryJSON = {}, cwd: string = '/'): IFS {
  return fromJSON(json, cwd)
}

export { DirectoryJSON }
