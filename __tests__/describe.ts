import fs from 'fs'
import path from 'path'
import colors from '../src/colors'

import {
  describe as describeFS,
  describeComparison,
  createFs,
} from '../src/index'

const mocksPath = path.join(__dirname, 'mocks')

colors.level = 2

describe('Describe', () => {
  test('describes the OS fs', () => {
    const description = describeFS(fs, path.join(mocksPath, 'describe'))

    expect(description).toMatchSnapshot()
  })

  test('describes an in-memory fs', () => {
    const source = createFs({
      'a.txt': 'a',
      'b.txt': 'b',
    })

    const description = describeFS(source, '/')

    expect(description).toMatchSnapshot()
  })

  test('describes an in-memory fs with a single file', () => {
    const source = createFs({
      'a.txt': 'a',
    })

    const description = describeFS(source, '/')

    expect(description).toMatchSnapshot()
  })

  test('describes a deeply nested fs', () => {
    const source = createFs({
      '/a/b/c/d/e/f/g.txt': 'g',
      '/a/b/c/d/e/f/h.txt': 'h',
    })

    const description = describeFS(source, '/')

    expect(description).toMatchSnapshot()
  })

  describe('describeComparison', () => {
    const target = createFs({
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
