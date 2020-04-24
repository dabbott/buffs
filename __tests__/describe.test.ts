import fs from 'fs'
import path from 'path'

import {
  describe as describeFS,
  describeComparison,
  createFs,
} from '../src/index'

const mocksPath = path.join(__dirname, 'mocks')

describe('Describe', () => {
  test('describes a fs', () => {
    const description = describeFS(fs, path.join(mocksPath, 'describe'))

    expect(description).toMatchSnapshot()
  })

  describe('describeComparison', () => {
    const { volume, fs: target } = createFs()

    volume.mkdirpSync(path.join(mocksPath, 'describe', 'b'))
    target.writeFileSync(
      path.join(mocksPath, 'describe', 'b', 'b.txt'),
      'something'
    )

    test('describes a colorized fs comparison', () => {
      const description = describeComparison(
        fs,
        target,
        path.join(mocksPath, 'describe'),
        { colorize: true }
      )

      expect(description).toMatchSnapshot()
    })

    test('describes an uncolored fs comparison', () => {
      const description = describeComparison(
        fs,
        target,
        path.join(mocksPath, 'describe')
      )

      expect(description).toMatchSnapshot()
    })
  })
})
