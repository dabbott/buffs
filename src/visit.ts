import path from 'path'
import type { IFS } from './ifs'
import {
  visit as visitTree,
  EnterReturnValue,
  LeaveReturnValue,
} from 'tree-visit'
import { isDirectory } from './utils'

export { EnterReturnValue, LeaveReturnValue, SKIP, STOP } from 'tree-visit'

export type VisitOptions = {
  onEnter?: (currentPath: string) => EnterReturnValue
  onLeave?: (currentPath: string) => LeaveReturnValue
}

export function visit(
  source: IFS,
  rootPath: string,
  options: ((currentPath: string) => EnterReturnValue) | VisitOptions
): void {
  const normalizedOptions: VisitOptions =
    typeof options === 'function' ? { onEnter: options } : options

  visitTree('', {
    onEnter: (currentPath) => {
      if (normalizedOptions.onEnter) {
        return normalizedOptions.onEnter(currentPath)
      }
    },
    onLeave: (currentPath) => {
      if (normalizedOptions.onLeave) {
        return normalizedOptions.onLeave(currentPath)
      }
    },
    getChildren: (currentPath) => {
      const fullPath = path.join(rootPath, currentPath)

      if (!isDirectory(source, fullPath)) return []

      return source
        .readdirSync(fullPath)
        .map((child) => path.join(currentPath, child))
    },
  })
}
