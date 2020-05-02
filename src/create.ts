import { Volume, createFsFromVolume, DirectoryJSON } from 'memfs'
import { Volume as VolumeType } from 'memfs/lib/volume'
import { IFS } from 'unionfs/lib/fs'

/**
 * Create an in-memory filesystem.
 *
 * This is a wrapper around memfs (https://github.com/streamich/memfs).
 *
 * @param json A map of { filename: value }
 * @param cwd A directory path to prepend to each file path in the `json` map
 */
export function createFs(
  json: DirectoryJSON = {},
  cwd: string = '/'
): { volume: VolumeType; fs: IFS } {
  const volume = Volume.fromJSON(json, cwd)
  const memfs = createFsFromVolume(volume)
  return { volume, fs: memfs as any }
}

export { VolumeType, DirectoryJSON }
