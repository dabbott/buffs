import { fromJSON, toJSON } from '../src/index'

describe('Create', () => {
  test('creates an in-memory filesystem', () => {
    const fs = fromJSON({ 'a.txt': 'hello' })

    expect(toJSON(fs)).toEqual({ '/a.txt': 'hello' })
  })

  test('creates an in-memory filesystem at the specified cwd', () => {
    const fs = fromJSON({ 'a.txt': 'hello' }, '/tmp/example')

    expect(toJSON(fs)).toEqual({ '/tmp/example/a.txt': 'hello' })
  })

  test('creates a nested file', () => {
    const fs = fromJSON({ 'a/a.txt': 'hello' })

    expect(fs.readdirSync('/a')).toEqual(['a.txt'])
  })

  test('creates an empty directory', () => {
    const fs = fromJSON({ a: null, '/b': null })

    expect(fs.statSync('/a').isDirectory()).toEqual(true)
    expect(fs.statSync('/b').isDirectory()).toEqual(true)

    expect(toJSON(fs)).toEqual({ '/a': null, '/b': null })
  })
})
