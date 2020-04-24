import { IFS } from 'unionfs/lib/fs'
import { isDirectory } from './utils'

export enum CompareResult {
  Added = `A`,
  Modified = `M`,
  Removed = `R`,
  NoChange = `N`,
}

/**
 * Compare 2 files on different filesystems.
 *
 * @param source Source (original) filesystem
 * @param target Target (updated) filesystem
 * @param filePath
 *
 * @returns {CompareResult} One of: A (Added), M (Modified), R (Removed), or N (No change)
 */
export function compareFile(
  source: IFS,
  target: IFS,
  filePath: string
): CompareResult {
  const sourceFileExists = source.existsSync(filePath)
  const targetFileExists = target.existsSync(filePath)

  if (!sourceFileExists && !targetFileExists) {
    return CompareResult.NoChange
  } else if (sourceFileExists && !targetFileExists) {
    return CompareResult.Added
  } else if (!sourceFileExists && targetFileExists) {
    return CompareResult.Removed
  }

  const sourceIsDirectory = isDirectory(source, filePath)
  const targetIsDirectory = isDirectory(target, filePath)

  if (!sourceIsDirectory && !targetIsDirectory) {
    const sourceData = source.readFileSync(filePath)
    const targetData = target.readFileSync(filePath)

    return sourceData.compare(targetData) === 0
      ? CompareResult.NoChange
      : CompareResult.Modified
  } else {
    return sourceIsDirectory === targetIsDirectory
      ? CompareResult.NoChange
      : CompareResult.Modified
  }
}
