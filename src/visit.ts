import path from 'path'
import { IFS } from 'unionfs/lib/fs'
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
  options: VisitOptions
): void {
  visitTree('', {
    onEnter: (currentPath) => {
      if (options.onEnter) {
        return options.onEnter(currentPath)
      }
    },
    onLeave: (currentPath) => {
      if (options.onLeave) {
        return options.onLeave(currentPath)
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
