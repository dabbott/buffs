import { createFs, toBSON, fromBSON, toJSON } from '../src'
import { encodeDocument, decodeDocument } from '../src/bson'
import { isDirectory } from '../src/utils'

describe('BSON', () => {
  test('serializes bson', () => {
    const doc = { hello: Buffer.from('world') }
    const encoded = encodeDocument(doc)
    const decoded = decodeDocument(encoded)

    expect(decoded).toEqual(doc)
  })

  test('serializes fs to bson', () => {
    const fs = createFs({ hello: 'world', '/dir': null })
    fs.writeFileSync('/foo', Buffer.from('bar'))

    const encoded = toBSON(fs)
    const decoded = fromBSON(encoded)

    expect(decoded.readFileSync('/hello', 'utf8')).toEqual('world')
    expect(decoded.readFileSync('/foo', 'utf8')).toEqual('bar')
    expect(isDirectory(decoded, '/dir')).toEqual(true)
  })

  test('creates an in-memory filesystem', () => {
    const fs = fromBSON(encodeDocument({ 'a.txt': Buffer.from('hello') }))

    expect(toJSON(fs)).toEqual({ '/a.txt': 'hello' })
  })

  test('creates an in-memory filesystem at the specified cwd', () => {
    const fs = fromBSON(
      encodeDocument({ 'a.txt': Buffer.from('hello') }),
      '/tmp/example'
    )

    expect(toJSON(fs)).toEqual({ '/tmp/example/a.txt': 'hello' })
  })

  test('creates a nested file', () => {
    const fs = fromBSON(encodeDocument({ 'a/a.txt': Buffer.from('hello') }))

    expect(fs.readdirSync('/a')).toEqual(['a.txt'])
  })

  test('creates an empty directory', () => {
    const fs = fromBSON(encodeDocument({ a: null, '/b': null }))

    expect(fs.statSync('/a').isDirectory()).toEqual(true)
    expect(fs.statSync('/b').isDirectory()).toEqual(true)

    expect(toJSON(fs)).toEqual({ '/a': null, '/b': null })
  })
})
