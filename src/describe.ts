import path from 'path'
import { IFS } from 'unionfs/lib/fs'
import { isDirectory } from './utils'
import { compareFile, CompareResult } from './compare'
import chalk from 'chalk'

enum LinePrefix {
  Child = `├── `,
  LastChild = `└── `,
  NestedChild = `│   `,
  LastNestedChild = `    `,
}

type Line = {
  path: string
  label: string
  depth: number
  prefix: string
}

function describeFile(source: IFS, filePath: string, depth: number): Line[] {
  let rootLine = {
    path: filePath,
    label: path.basename(filePath),
    depth: depth,
    prefix: '',
  }

  if (isDirectory(source, filePath)) {
    const files = source.readdirSync(filePath)

    if (files.length === 1) {
      const childPath = path.join(filePath, files[0])
      const lines = describeFile(source, childPath, depth)
      lines[0].label = `${rootLine.label} / ${lines[0].label}`
      return lines
    }

    const nestedLines: Line[] = files.flatMap((file, index, array) => {
      const childIsLast = index === array.length - 1
      const childPath = path.join(filePath, file)
      const childLines = describeFile(source, childPath, depth + 1)

      const childPrefix = childIsLast ? LinePrefix.LastChild : LinePrefix.Child

      childLines.forEach((line) => {
        if (line.depth === depth + 1) {
          line.prefix = childPrefix + line.prefix
        } else if (childIsLast) {
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
  const lines = describeFile(source, filePath, 0)
  const strings = lines.map((line) => line.prefix + line.label)
  return strings.join('\n')
}

export function createColorizer(
  compareResult: CompareResult
): (string: string) => void {
  switch (compareResult) {
    case CompareResult.Added:
      return chalk.green
    case CompareResult.Modified:
      return chalk.yellow
    case CompareResult.Removed:
      return chalk.red
    case CompareResult.NoChange:
      return chalk.gray
  }
}

/**
 * Create a description of all files in the source filesystem,
 * relative to the target filesystem.
 */
export function describeComparison(
  source: IFS,
  target: IFS,
  filePath: string,
  options: { colorize?: boolean } = {}
): string {
  const lines = describeFile(source, filePath, 0)

  if (options.colorize) {
    return lines
      .map((line) => {
        const compareResult = compareFile(source, target, line.path)
        const colorizer = createColorizer(compareResult)
        return `${line.prefix}${colorizer(line.label)}`
      })
      .join('\n')
  }

  return lines
    .map(
      (line) =>
        `${line.prefix}${line.label}[${compareFile(source, target, line.path)}]`
    )
    .join('\n')
}
