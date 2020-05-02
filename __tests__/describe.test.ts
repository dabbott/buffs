import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

import {
  describe as describeFS,
  describeComparison,
  createFs,
} from '../src/index'

const mocksPath = path.join(__dirname, 'mocks')

chalk.level = 2

describe('Describe', () => {
  test('describes a fs', () => {
    const description = describeFS(fs, path.join(mocksPath, 'describe'))

    expect(description).toMatchSnapshot()
  })

  describe('describeComparison', () => {
    const { volume, fs: target } = createFs({
      [path.join(mocksPath, 'describe', 'b', 'b.txt')]: 'something',
    })

    test('describes a colored fs comparison', () => {
      const description = describeComparison(
        fs,
        target,
        path.join(mocksPath, 'describe')
      )

      expect(description).toMatchSnapshot()
    })

    test('describes an uncolored fs comparison', () => {
      const description = describeComparison(
        fs,
        target,
        path.join(mocksPath, 'describe'),
        { colorize: false }
      )

      expect(description).toMatchSnapshot()
    })
  })
})
