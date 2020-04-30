# buffs

A filesystem utility, supporting batch & in-memory operations.

```bash
npm install --save buffs
```

## API

### **copy**

`(source: IFS, target: IFS, sourcePath: string, targetPath?: string, options?: CopyOptions) => void`

Copy a file from the source to the target filesystem recursively.

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
