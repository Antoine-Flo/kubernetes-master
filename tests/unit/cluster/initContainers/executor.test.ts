import { describe, expect, it } from 'vitest'
import { createFileSystem } from '../../../../src/filesystem/FileSystem'
import { debianFileSystem } from '../../../../src/filesystem/debianFileSystem'
import { executeInitContainer } from '../../../../src/cluster/initContainers/executor'
import type { Container } from '../../../../src/cluster/ressources/Pod'

describe('Init Container Executor', () => {
    describe('executeInitContainer', () => {
        it('should execute touch command to create empty file', () => {
            const container: Container = {
                name: 'init-setup',
                image: 'busybox:latest',
                command: ['touch'],
                args: ['/tmp/ready'],
            }

            const initialState = debianFileSystem()

            const result = executeInitContainer(container, initialState)

            expect(result.ok).toBe(true)
            if (result.ok) {
                const updatedFs = createFileSystem(result.value)
                const fileResult = updatedFs.readFile('/tmp/ready')
                expect(fileResult.ok).toBe(true)
                if (fileResult.ok) {
                    expect(fileResult.value).toBe('')
                }
            }
        })

        it('should execute mkdir -p to create nested directories', () => {
            const container: Container = {
                name: 'init-data',
                image: 'alpine:latest',
                command: ['mkdir'],
                args: ['-p', '/data/cache'],
            }

            const initialState = debianFileSystem()

            const result = executeInitContainer(container, initialState)

            expect(result.ok).toBe(true)
            if (result.ok) {
                const updatedFs = createFileSystem(result.value)
                const listResult = updatedFs.listDirectory('/data/cache')
                expect(listResult.ok).toBe(true)
            }
        })

        it('should execute echo redirect to create file with content', () => {
            const container: Container = {
                name: 'init-config',
                image: 'busybox:latest',
                command: ['sh'],
                args: ['-c', 'echo "hello world" > /tmp/config.txt'],
            }

            const initialState = debianFileSystem()

            const result = executeInitContainer(container, initialState)

            expect(result.ok).toBe(true)
            if (result.ok) {
                const updatedFs = createFileSystem(result.value)
                const fileResult = updatedFs.readFile('/tmp/config.txt')
                expect(fileResult.ok).toBe(true)
                if (fileResult.ok) {
                    expect(fileResult.value).toBe('hello world')
                }
            }
        })

        it('should return error for invalid command', () => {
            const container: Container = {
                name: 'init-fail',
                image: 'busybox:latest',
                command: ['invalidcommand'],
                args: ['arg1'],
            }

            const initialState = debianFileSystem()

            const result = executeInitContainer(container, initialState)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('invalidcommand')
            }
        })

        it('should handle container without command (no-op)', () => {
            const container: Container = {
                name: 'init-noop',
                image: 'busybox:latest',
            }

            const initialState = debianFileSystem()

            const result = executeInitContainer(container, initialState)

            expect(result.ok).toBe(true)
            if (result.ok) {
                // State should be unchanged
                expect(result.value).toEqual(initialState)
            }
        })

        it('should handle multiple touch commands', () => {
            const container: Container = {
                name: 'init-multi',
                image: 'busybox:latest',
                command: ['sh'],
                args: ['-c', 'touch /tmp/file1 && touch /tmp/file2'],
            }

            const initialState = debianFileSystem()

            const result = executeInitContainer(container, initialState)

            expect(result.ok).toBe(true)
            if (result.ok) {
                const updatedFs = createFileSystem(result.value)
                const file1Result = updatedFs.readFile('/tmp/file1')
                const file2Result = updatedFs.readFile('/tmp/file2')
                expect(file1Result.ok).toBe(true)
                expect(file2Result.ok).toBe(true)
            }
        })

        it('should handle mkdir without -p flag', () => {
            const container: Container = {
                name: 'init-simple-dir',
                image: 'alpine:latest',
                command: ['mkdir'],
                args: ['/tmp/newdir'],
            }

            const initialState = debianFileSystem()

            const result = executeInitContainer(container, initialState)

            expect(result.ok).toBe(true)
            if (result.ok) {
                const updatedFs = createFileSystem(result.value)
                const listResult = updatedFs.listDirectory('/tmp/newdir')
                expect(listResult.ok).toBe(true)
            }
        })

        it('should handle path that does not start with /', () => {
            const container: Container = {
                name: 'init-relative',
                image: 'busybox:latest',
                command: ['touch'],
                args: ['ready.txt'],
            }

            const initialState = debianFileSystem()

            const result = executeInitContainer(container, initialState)

            expect(result.ok).toBe(true)
            if (result.ok) {
                const updatedFs = createFileSystem(result.value)
                // Should create in current directory (/)
                const fileResult = updatedFs.readFile('/ready.txt')
                expect(fileResult.ok).toBe(true)
            }
        })
    })
})

