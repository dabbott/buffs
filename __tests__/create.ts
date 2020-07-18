import { createFs, toJSON } from '../src/index'

describe('Create', () => {
  test('creates an in-memory filesystem', () => {
    const { fs } = createFs({ 'a.txt': 'hello' })

    expect(toJSON(fs)).toEqual({ '/a.txt': 'hello' })
  })

  test('creates an in-memory filesystem at the specified cwd', () => {
    const { fs } = createFs({ 'a.txt': 'hello' }, '/tmp/example')

    expect(toJSON(fs)).toEqual({ '/tmp/example/a.txt': 'hello' })
  })

  test('creates a nested file', () => {
    const { fs } = createFs({ 'a/a.txt': 'hello' })

    expect(fs.readdirSync('/a')).toEqual(['a.txt'])
  })
})
