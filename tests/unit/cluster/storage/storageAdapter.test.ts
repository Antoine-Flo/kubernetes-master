import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createStorageAdapter } from '../../../../src/cluster/storage/storageAdapter'

describe('StorageAdapter', () => {
    let storage: ReturnType<typeof createStorageAdapter>

    beforeEach(() => {
        localStorage.clear()
        storage = createStorageAdapter()
    })

    describe('save and load', () => {
        it('should save and load simple objects', () => {
            const data = { name: 'test', value: 42 }
            const saveResult = storage.save('test-key', data)

            expect(saveResult.ok).toBe(true)

            const loadResult = storage.load<typeof data>('test-key')

            expect(loadResult.ok).toBe(true)
            if (loadResult.ok) {
                expect(loadResult.value).toEqual(data)
            }
        })

        it('should save and load arrays', () => {
            const data = [1, 2, 3, 'test', { nested: true }]
            const saveResult = storage.save('array-key', data)

            expect(saveResult.ok).toBe(true)

            const loadResult = storage.load<typeof data>('array-key')

            expect(loadResult.ok).toBe(true)
            if (loadResult.ok) {
                expect(loadResult.value).toEqual(data)
            }
        })

        it('should save and load nested objects', () => {
            const data = {
                level1: {
                    level2: {
                        level3: {
                            value: 'deep',
                        },
                    },
                },
            }
            const saveResult = storage.save('nested-key', data)

            expect(saveResult.ok).toBe(true)

            const loadResult = storage.load<typeof data>('nested-key')

            expect(loadResult.ok).toBe(true)
            if (loadResult.ok) {
                expect(loadResult.value).toEqual(data)
            }
        })
    })

    describe('Map serialization', () => {
        it('should serialize and deserialize Map objects', () => {
            const map = new Map<string, number>([
                ['a', 1],
                ['b', 2],
                ['c', 3],
            ])
            const data = { myMap: map }

            const saveResult = storage.save('map-key', data)

            expect(saveResult.ok).toBe(true)

            const loadResult = storage.load<typeof data>('map-key')

            expect(loadResult.ok).toBe(true)
            if (loadResult.ok) {
                expect(loadResult.value.myMap).toBeInstanceOf(Map)
                expect(loadResult.value.myMap.get('a')).toBe(1)
                expect(loadResult.value.myMap.get('b')).toBe(2)
                expect(loadResult.value.myMap.get('c')).toBe(3)
            }
        })

        it('should handle nested Maps', () => {
            const innerMap = new Map([['inner', 'value']])
            const outerMap = new Map([['outer', innerMap]])
            const data = { map: outerMap }

            const saveResult = storage.save('nested-map-key', data)

            expect(saveResult.ok).toBe(true)

            const loadResult = storage.load<typeof data>('nested-map-key')

            expect(loadResult.ok).toBe(true)
            if (loadResult.ok) {
                expect(loadResult.value.map).toBeInstanceOf(Map)
                const inner = loadResult.value.map.get('outer')
                expect(inner).toBeInstanceOf(Map)
                if (inner) {
                    expect(inner.get('inner')).toBe('value')
                }
            }
        })

        it('should handle Map with complex values', () => {
            const map = new Map([
                ['user1', { name: 'Alice', age: 30 }],
                ['user2', { name: 'Bob', age: 25 }],
            ])
            const data = { users: map }

            const saveResult = storage.save('complex-map-key', data)

            expect(saveResult.ok).toBe(true)

            const loadResult = storage.load<typeof data>('complex-map-key')

            expect(loadResult.ok).toBe(true)
            if (loadResult.ok) {
                expect(loadResult.value.users).toBeInstanceOf(Map)
                expect(loadResult.value.users.get('user1')).toEqual({ name: 'Alice', age: 30 })
                expect(loadResult.value.users.get('user2')).toEqual({ name: 'Bob', age: 25 })
            }
        })
    })

    describe('error handling', () => {
        it('should return error when loading non-existent key', () => {
            const result = storage.load('non-existent-key')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('No data found')
            }
        })

        it('should return error when loading invalid JSON', () => {
            localStorage.setItem('invalid-json', '{invalid json}')
            const result = storage.load('invalid-json')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Deserialization failed')
            }
        })

        it('should handle quota exceeded errors', () => {
            // Mock localStorage.setItem to throw QuotaExceededError
            const err = new Error('Quota exceeded')
            err.name = 'QuotaExceededError'

            const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
            setItemSpy.mockImplementation(() => {
                throw err
            })

            // Create new storage instance with mocked localStorage
            const testStorage = createStorageAdapter()
            const result = testStorage.save('test', { data: 'test' })

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toBe('Storage quota exceeded')
            }

            // Restore
            setItemSpy.mockRestore()
        })

        it('should handle circular references gracefully', () => {
            const circular: any = { name: 'test' }
            circular.self = circular

            const result = storage.save('circular', circular)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Serialization failed')
            }
        })
    })

    describe('clear operations', () => {
        it('should clear specific key', () => {
            storage.save('key1', { data: 'test1' })
            storage.save('key2', { data: 'test2' })

            const clearResult = storage.clear('key1')

            expect(clearResult.ok).toBe(true)

            const load1 = storage.load('key1')
            const load2 = storage.load('key2')

            expect(load1.ok).toBe(false)
            expect(load2.ok).toBe(true)
        })

        it('should clear all keys', () => {
            storage.save('key1', { data: 'test1' })
            storage.save('key2', { data: 'test2' })
            storage.save('key3', { data: 'test3' })

            const clearResult = storage.clearAll()

            expect(clearResult.ok).toBe(true)

            const load1 = storage.load('key1')
            const load2 = storage.load('key2')
            const load3 = storage.load('key3')

            expect(load1.ok).toBe(false)
            expect(load2.ok).toBe(false)
            expect(load3.ok).toBe(false)
        })

        it('should not error when clearing non-existent key', () => {
            const result = storage.clear('non-existent')

            expect(result.ok).toBe(true)
        })
    })

    describe('overwrite behavior', () => {
        it('should overwrite existing data', () => {
            storage.save('test-key', { value: 'old' })
            storage.save('test-key', { value: 'new' })

            const result = storage.load<{ value: string }>('test-key')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.value).toBe('new')
            }
        })
    })
})

