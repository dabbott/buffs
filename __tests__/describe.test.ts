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

      expect(description).toMatchInlineSnapshot(`
        "[90mdescribe[39m
        ├── [32ma / a.txt[39m
        └── [90mb[39m
            ├── [33mb.txt[39m
            ├── [32mc[39m
            │   ├── [32mc.txt[39m
            │   ├── [32md / d.txt[39m
            │   └── [32me.txt[39m
            └── [32mf.txt[39m"
      `)
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
