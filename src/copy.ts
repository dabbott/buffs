import path from 'path'
import { IFS } from 'unionfs/lib/fs'
import { isDirectory } from './utils'

/**
 * Copy all files from the source filesystem to the target filesystem
 */
export function copy(source: IFS, target: IFS, filePath: string) {
  if (isDirectory(source, filePath)) {
    const files = source.readdirSync(filePath)

    try {
      target.mkdirSync(filePath, { recursive: true })
    } catch (error) {
      // Directory already exists
    }

    files.forEach((file) => {
      const childPath = path.join(filePath, file)
      copy(source, target, childPath)
    })
  } else {
    const data = source.readFileSync(filePath)
    target.writeFileSync(filePath, data)
  }
}
