import path from 'path'
import type { IFS } from './ifs'
import { DirectoryBufferJSON, fromJSON } from './json'
import { isDirectory } from './utils'
import { visit } from './visit'

// A subset of the spec (http://bsonspec.org/spec.html), supporting binary data and null

type DirectoryBSON = Record<string, Buffer | null>

class Int32 {
  bytes: Buffer // Little-endian

  constructor(value: number | Buffer) {
    this.bytes =
      typeof value === 'number'
        ? Buffer.from([
            value & 0x000000ff,
            (value & 0x0000ff00) >> 8,
            (value & 0x00ff0000) >> 16,
            (value & 0xff000000) >> 24,
          ])
        : value
  }

  valueOf() {
    const bytes = this.bytes

    return (bytes[3] << 24) + (bytes[2] << 16) + (bytes[1] << 8) + bytes[0]
  }
}

const BINARY_TYPE = 0x05
const NULL_TYPE = 0x0a

function encodeField(name: string, value: Buffer | null) {
  const typeBytes = Buffer.from([
    Buffer.isBuffer(value) ? BINARY_TYPE : NULL_TYPE,
  ])
  const nameBytes = Buffer.from(name + '\x00')

  if (Buffer.isBuffer(value)) {
    const subtypeBytes = Buffer.from([0])
    const size = new Int32(value.length)

    return Buffer.concat([
      typeBytes,
      nameBytes,
      size.bytes,
      subtypeBytes,
      value,
    ])
  } else {
    return Buffer.concat([typeBytes, nameBytes])
  }
}

export function encodeDocument(bson: DirectoryBSON): Buffer {
  const fields = Object.keys(bson).map((key) => encodeField(key, bson[key]))

  const size = 4 + fields.reduce((result, next) => result + next.length, 0) + 1
  const documentSize = new Int32(size)

  return Buffer.concat([documentSize.bytes, ...fields, Buffer.from([0])])
}

const NULL = 0

export function decodeInt32(
  buffer: Buffer,
  offset: number
): { size: number; offset: number } {
  const size = new Int32(buffer.slice(offset, offset + 4)).valueOf()

  return {
    size,
    offset: offset + 4,
  }
}

export function decodeName(
  buffer: Buffer,
  offset: number
): { name: string; offset: number } {
  const terminator = buffer.indexOf(NULL, offset)
  const name = buffer.slice(offset, terminator).toString()

  return {
    name,
    offset: terminator + 1,
  }
}

export function decodeBinaryData(
  buffer: Buffer,
  offset: number
): { value: Buffer; offset: number } {
  const { size, offset: sizeOffset } = decodeInt32(buffer, offset)
  const subtypeOffset = sizeOffset + 1 // Ignore binary subtype
  const value = buffer.slice(subtypeOffset, subtypeOffset + size)

  return {
    value,
    offset: subtypeOffset + size,
  }
}

type Field = { name: string; value: Buffer | null; offset: number }

export function decodeField(buffer: Buffer, offset: number): Field | undefined {
  const type = buffer[offset]
  const typeOffset = offset + 1

  switch (type) {
    case 0x00: {
      return
    }
    case BINARY_TYPE: {
      const { name, offset: nameOffset } = decodeName(buffer, typeOffset)
      const { value, offset: valueOffset } = decodeBinaryData(
        buffer,
        nameOffset
      )

      return { name, value, offset: valueOffset }
    }
    case NULL_TYPE: {
      const { name, offset: nameOffset } = decodeName(buffer, typeOffset)

      return { name, value: null, offset: nameOffset }
    }
    default:
      throw new Error(`BSON type ${type.toString(16)} not supported`)
  }
}

export function decodeDocument(buffer: Buffer): DirectoryBSON {
  let { size: documentSize, offset } = decodeInt32(buffer, 0)

  let json: DirectoryBSON = {}
  let field: Field | undefined

  while ((field = decodeField(buffer, offset))) {
    offset = field.offset
    json[field.name] = field.value

    if (offset >= documentSize - 1) break
  }

  return json
}

export function toBSON(source: IFS, rootPath: string = '/'): Buffer {
  const result: DirectoryBSON = {}

  visit(source, rootPath, (currentPath) => {
    const fullPath = path.join(rootPath, currentPath)

    if (isDirectory(source, fullPath)) {
      // Represent empty directories as null
      if (source.readdirSync(fullPath).length === 0) {
        result[fullPath] = null
      }
    } else {
      result[fullPath] = source.readFileSync(fullPath)
    }
  })

  return encodeDocument(result)
}

export function fromBSON(buffer: Buffer, rootPath: string = '/'): IFS {
  const decoded = decodeDocument(buffer)
  const bufferJSON: DirectoryBufferJSON = {}

  Object.entries(decoded).forEach(([key, value]) => {
    bufferJSON[key] = value
  })

  return fromJSON(decoded, rootPath)
}
