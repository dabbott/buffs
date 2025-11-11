# buffs

A filesystem utility, supporting batch & in-memory operations.

```bash
npm install --save buffs
```

## API

Every API works both on the real filesystem and in-memory filesystems created by [`createFs`](#createFs).

- [copy](#copy)
- [createFs](#createFs)
- [describe](#describe)
- [describeComparison](#describeComparison)
- [find](#find)
- [match](#match)
- [toJSON](#toJSON)
- [visit](#visit)

---

### `copy`

Copy a file or directory from the source to the target filesystem recursively.

**Type**: `(source: IFS, target: IFS, sourcePath: string, targetPath?: string, options?: CopyOptions) => void`

#### Example

```js
import fs from 'fs'
import process from 'process'
import { copy, createFs } from 'buffs'

// Create files using in-memory filesystem
const { fs: source } = createFs({
  '/a.txt': 'a',
  '/b/b.txt': 'b',
})

// Copy all files from source to your current directory
copy(source, fs, '/', process.cwd())
```

---

### `createFs`

Create an in-memory filesystem.

This is a wrapper around [`memfs`](https://github.com/streamich/memfs).

**Type**: `(json: DirectoryJSON = {}, cwd?: string) => { volume: VolumeType; fs: IFS }`

```js
import { createFs } from 'buffs'

// Create files using in-memory filesystem
const fs = createFs({
  '/a.txt': 'a',
  '/b/b.txt': 'b',
  '/c': null, // Empty directory
})
```

---

### `describe`

Create a description of all files in the source filesystem.

**Type**: `(source: IFS, filePath: string) => string`

#### Example

```js
import { describe, createFs } from 'buffs'

// Create files using in-memory filesystem
const fs = createFs({
  '/a.txt': 'a',
  '/b/b.txt': 'b',
})

const description = describe(fs, '/')

console.log(description)
// ├── a.txt
// └── b / b.txt
```

---

### `describeComparison`

Create a description of all files in the "updated" source filesystem, relative to the state of the "original" target filesystem.

**Type**: `(source: IFS, target: IFS, filePath: string, { colorize?: boolean }): string`

#### Example

```js
import { describeComparison, createFs } from 'buffs'

const source = createFs({
  '/a.txt': 'a',
  '/b/b.txt': 'b',
})

const target = createFs({
  '/b/b.txt': 'b',
})

const description = describeComparison(source, target, '/', { colorize: true })

console.log(description)
// ├── a.txt (printed in green, since it was "added")
// └── b / b.txt
```

---

### `find`

Find files and directories using an `include` predicate function.

If an `exclude` function option is passed, returning `true` will skip any file and its children, regardless of what `include` returned.

**Type**: `(source: IFS, searchPath: string, options: FindOptions) => string[]`

#### Example

```js
import { createFs, find } from 'buffs'

// Create files using in-memory filesystem
const fs = createFs({
  '/a.txt': 'a',
  '/b/b.txt': 'b',
})

const files = find(fs, '/', {
  include: (file) => file.endsWith('.txt'),
})

console.log(files)
// ['a.txt', 'b/b.txt']
```

---

### `match`

Find files and directories using glob patterns.

If an `excludePatterns` option is passed, matching paths are removed regardless of `includePatterns`.

Supported glob features (brief):

- Wildcards: `*` (within a segment), `?` (single char within a segment)
- Globstar: `**` (across segments). By default, dot-prefixed segments are not matched/traversed by `**`
- Character classes: `[...]`, ranges (e.g. `[0-9]`), negation `[!x]`, and POSIX classes
  - POSIX classes: `[:alnum:]`, `[:alpha:]`, `[:digit:]`, `[:xdigit:]`, `[:lower:]`, `[:upper:]`, `[:blank:]`, `[:space:]`, `[:word:]`, `[:punct:]`, `[:graph:]`, `[:print:]`, `[:ascii:]`, `[:cntrl:]`
  - Negated POSIX classes: `[:^class:]` inside `[]`
- Extglobs (segment-scoped): `@(a|b)`, `?(pat)`, `*(pat)`, `+(pat)`, `!(pat)`
- Braces: comma lists `{a,b}`, nested lists, numeric ranges `{1..3}` (with optional step), and alpha ranges `{a..c}`
  - Note: zero-padded numeric ranges like `{01..10}` are treated literally (not expanded)
- Escapes: `\` escapes the next character to match it literally (e.g. `\*`, `\?`, `\(`)
- Dotfiles: segments beginning with `.` only match when the corresponding pattern segment begins with `.` or explicitly targets them (e.g. `**/.*`)

**Type**: `(source: IFS, searchPath: string, options: MatchOptions) => string[]`

#### Example

```js
import { createFs, match } from 'buffs'

// Create files using in-memory filesystem
const fs = createFs({
  '/a.txt': 'a',
  '/b/b.txt': 'b',
})

const files = match(fs, '/', { includePatterns: ['**/*.txt'] })

console.log(files)
// ['a.txt', 'b/b.txt']
```

---

### `toJSON`

Convert a directory and all its files, recursively, to a JSON dictionary.

**Type**: `(source: IFS, rootPath: string) => DirectoryJSON`

#### Example

```js
import { createFs, match } from 'buffs'

// Create files using in-memory filesystem
const fs = createFs({
  '/a.txt': 'a',
  '/b/b.txt': 'b',
})

const json = toJSON(fs)

console.log(json)
// { '/a.txt': 'a', '/b/b.txt': 'b' }
```

---

### `visit`

Traverse a directory recursively, calling an optional `onEnter` and `onLeave` function for each file and directory.

From `onEnter`:

- return nothing or `undefined` to continue
- return `"skip"` to skip any children of that directory and the subsequent `onLeave`
- return `"stop"` to end traversal

From `onLeave`:

- return nothing or `undefined` to continue
- return `"stop"` to end traversal

**Type**: `(source: IFS, rootPath: string, options: VisitOptions) => void`

#### Example

```js
import path from 'path'
import { createFs, visit } from 'buffs'

// Create files using in-memory filesystem
const fs = createFs({
  '/a.txt': 'a',
  '/b/b.txt': 'b',
})

const allFiles = []

const files = visit(fs, '/', {
  onEnter: (file) => {
    allFiles.push(path.join('/', file))
  },
})

console.log(allFiles)
// ['/', '/a.txt', '/b', '/b/b.txt']
```
