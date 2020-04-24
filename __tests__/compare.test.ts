import { compareFile, createFs, CompareResult } from '../src/index'

const testFilePath = '/a.txt'

describe('Compare', () => {
  test('detects a file was added', () => {
    const { fs: source } = createFs()
    const { fs: target } = createFs()

    source.writeFileSync(testFilePath, 'hello')

    const compareResult = compareFile(source, target, testFilePath)

    expect(compareResult).toBe(CompareResult.Added)
  })

  test('detects a file was removed', () => {
    const { fs: source } = createFs()
    const { fs: target } = createFs()

    target.writeFileSync(testFilePath, 'hello')

    const compareResult = compareFile(source, target, testFilePath)

    expect(compareResult).toBe(CompareResult.Removed)
  })

  test('detects a file was modified', () => {
    const { fs: source } = createFs()
    const { fs: target } = createFs()

    source.writeFileSync(testFilePath, 'hello1')
    target.writeFileSync(testFilePath, 'hello2')

    const compareResult = compareFile(source, target, testFilePath)

    expect(compareResult).toBe(CompareResult.Modified)
  })

  test('detects a file was not changed', () => {
    const { fs: source } = createFs()
    const { fs: target } = createFs()

    source.writeFileSync(testFilePath, 'hello')
    target.writeFileSync(testFilePath, 'hello')

    const compareResult = compareFile(source, target, testFilePath)

    expect(compareResult).toBe(CompareResult.NoChange)
  })
})
