import { createFs } from '../src/index'

describe('Create', () => {
  test('creates an in-memory filesystem', () => {
    const { volume } = createFs({ 'a.txt': 'hello' })

    expect(volume.toJSON()).toEqual({ '/a.txt': 'hello' })
  })

  test('creates an in-memory filesystem at the specified cwd', () => {
    const { volume } = createFs({ 'a.txt': 'hello' }, '/tmp/example')

    expect(volume.toJSON()).toEqual({ '/tmp/example/a.txt': 'hello' })
  })
})
