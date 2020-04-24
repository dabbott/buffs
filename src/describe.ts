import path from 'path'
import { IFS } from 'unionfs/lib/fs'
import { isDirectory } from './utils'

enum LinePrefix {
  Child = `├── `,
  LastChild = `└── `,
  NestedChild = `│   `,
  LastNestedChild = `    `,
}

type Line = {
  label: string
  depth: number
  prefix: string
}

function descriptionOfFile(
  source: IFS,
  filePath: string,
  depth: number,
  isLast: boolean
): Line[] {
  let rootLine = {
    label: path.basename(filePath),
    depth: depth,
    prefix: '',
  }

  if (isDirectory(source, filePath)) {
    const files = source.readdirSync(filePath)

    if (files.length === 1) {
      const childPath = path.join(filePath, files[0])
      const lines = descriptionOfFile(source, childPath, depth, isLast)
      lines[0].label = `${rootLine.label} / ${lines[0].label}`
      return lines
    }

    const nestedLines: Line[] = files.flatMap((file, index, array) => {
      const childIsLast = index === array.length - 1
      const childPath = path.join(filePath, file)
      const childLines = descriptionOfFile(source, childPath, depth + 1, isLast)

      const childPrefix = childIsLast ? LinePrefix.LastChild : LinePrefix.Child

      childLines.forEach((line) => {
        if (line.depth === depth + 1) {
          line.prefix = childPrefix + line.prefix
        } else if (isLast && childIsLast) {
          line.prefix = LinePrefix.LastNestedChild + line.prefix
        } else {
          line.prefix = LinePrefix.NestedChild + line.prefix
        }
      })

      return childLines
    })

    return [rootLine, ...nestedLines]
  } else {
    return [rootLine]
  }
}

/**
 * Create a description of all files in the source filesystem
 */
export function describe(source: IFS, filePath: string): string {
  const lines = descriptionOfFile(source, filePath, 0, true)
  const strings = lines.map((line) => line.prefix + line.label)
  return strings.join('\n')
}
