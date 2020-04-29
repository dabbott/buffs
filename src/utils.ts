import { Volume, createFsFromVolume, DirectoryJSON } from 'memfs'
import { Volume as VolumeType } from 'memfs/lib/volume'
import { IFS } from 'unionfs/lib/fs'

export function isDirectory(source: IFS, path: string) {
  return source.lstatSync(path).isDirectory()
}

/**
 * Create an in-memory filesystem
 */
export function createFs(
  json: DirectoryJSON = {},
  cwd?: string
): { volume: VolumeType; fs: IFS } {
  const volume = Volume.fromJSON(json, cwd)
  const memfs = createFsFromVolume(volume)
  return { volume, fs: memfs as any }
}

export { VolumeType, DirectoryJSON }
