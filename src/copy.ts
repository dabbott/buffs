import path from 'path'
import { IFS } from 'unionfs/lib/fs'
import { isDirectory } from './utils'

export type CopyOptions = {
  /**
   * Filter files to copy. Return true to copy a file, or false to ignore.
   *
   * This is passed the updated `targetPath` (after applying `formatTargetName`,
   * if one is given).
   */
  filterPath?: (options: { sourcePath: string; targetPath: string }) => boolean

  /**
   * Choose a name for each file as it's copied.
   */
  formatTargetName?: (options: {
    sourcePath: string
    targetPath: string
  }) => string
}

/**
 * Copy a file or directory from the source to the target filesystem recursively.
 */
export function copy(
  source: IFS,
  target: IFS,
  sourcePath: string,
  targetPath: string = sourcePath,
  options: CopyOptions = {}
) {
  const formattedTargetPath = options.formatTargetName
    ? path.join(
        path.dirname(targetPath),
        options.formatTargetName({ sourcePath, targetPath })
      )
    : targetPath

  if (
    options.filterPath &&
    !options.filterPath({ sourcePath, targetPath: formattedTargetPath })
  ) {
    return
  }

  if (isDirectory(source, sourcePath)) {
    const files = source.readdirSync(sourcePath)

    try {
      target.mkdirSync(formattedTargetPath, { recursive: true })
    } catch (error) {
      // Assume the directory already exists.
      // This will fail later if the directory doesn't exist.
    }

    files.forEach((file) => {
      const sourceChildPath = path.join(sourcePath, file)
      const targetChildPath = path.join(formattedTargetPath, file)
      copy(source, target, sourceChildPath, targetChildPath, options)
    })
  } else {
    const data = source.readFileSync(sourcePath)
    target.writeFileSync(formattedTargetPath, data)
  }
}
