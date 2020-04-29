import path from 'path'
import { IFS } from 'unionfs/lib/fs'
import { isDirectory } from './utils'

/**
 * Copy a file (recursively) from the source to the target filesystem
 */
export function copy(
  source: IFS,
  target: IFS,
  sourcePath: string,
  targetPath: string = sourcePath
) {
  if (isDirectory(source, sourcePath)) {
    const files = source.readdirSync(sourcePath)

    try {
      target.mkdirSync(targetPath, { recursive: true })
    } catch (error) {
      // Assume the directory already exists.
      // This will fail later if the directory doesn't exist.
    }

    files.forEach((file) => {
      const sourceChildPath = path.join(sourcePath, file)
      const targetChildPath = path.join(targetPath, file)
      copy(source, target, sourceChildPath, targetChildPath)
    })
  } else {
    const data = source.readFileSync(sourcePath)
    target.writeFileSync(targetPath, data)
  }
}
