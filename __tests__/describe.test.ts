import fs from 'fs'
import path from 'path'

import { describe as describeFS } from '../src/index'

const mocksPath = path.join(__dirname, 'mocks')

describe('Describe', () => {
  test('describes a fs', () => {
    const description = describeFS(fs, path.join(mocksPath, 'describe'))

    expect(description).toMatchSnapshot()
  })
})
