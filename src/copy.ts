import path from 'path'
import type { IFS } from './ifs'

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

  /**
   * Copy file and directory permissions? Defaults to `true`.
   */
  copyPermissions?: boolean

  /**
   * Copy root directory permissions? Defaults to `false`.
   *
   * This overrides the `copyPermissions` setting just for the directory '/',
   * which is the root of all file systems created by memfs. It's convenient
   * to put files directly under '/' when using in-memory file systems, but
   * it's unlikely that we want to copy the restrictive default permissions of
   * the '/' directory.
   */
  copyRootDirectoryPermissions?: boolean
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

  const stat = source.lstatSync(sourcePath)

  if (stat.isDirectory()) {
    const files = source.readdirSync(sourcePath)

    try {
      target.mkdirSync(formattedTargetPath, { recursive: true })
    } catch (error) {
      // Assume the directory already exists.
      // This will fail later if the directory doesn't exist.
    }

    if (
      sourcePath === '/'
        ? options.copyRootDirectoryPermissions === true
        : options.copyPermissions !== false
    ) {
      // We use fchmod instead of chmod to work around an issue with memfs
      // where directory permissions can't be set with chmod.
      try {
        let fd = target.openSync(formattedTargetPath, 'r')
        target.fchmodSync(fd, stat.mode)
      } catch {
        // Consider permissions non-essential and continue
      }
    }

    files.forEach((file) => {
      const sourceChildPath = path.join(sourcePath, file)
      const targetChildPath = path.join(formattedTargetPath, file)
      copy(source, target, sourceChildPath, targetChildPath, options)
    })
  } else {
    const data = source.readFileSync(sourcePath)

    target.writeFileSync(formattedTargetPath, data)

    if (options.copyPermissions !== false) {
      target.chmodSync(formattedTargetPath, stat.mode)
    }
  }
}
