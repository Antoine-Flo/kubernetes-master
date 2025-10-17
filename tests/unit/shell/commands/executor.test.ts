import { describe, it, expect, beforeEach } from 'vitest'
import { createShellExecutor, type FileSystem } from '../../../../src/shell/commands/executor'
import { createFileSystem } from '../../../../src/filesystem/FileSystem'
import { createLogger, type Logger } from '../../../../src/logger/Logger'

describe('Shell Executor', () => {
    let fileSystem: FileSystem
    let logger: Logger
    let executor: ReturnType<typeof createShellExecutor>

    beforeEach(() => {
        // Create a fresh filesystem and logger for each test
        fileSystem = createFileSystem()
        logger = createLogger()
        executor = createShellExecutor(fileSystem, logger)
    })

    describe('pwd command', () => {
        it('should return current path at root', () => {
            const result = executor.execute('pwd')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data).toBe('/')
            }
        })

        it('should return current path after cd', () => {
            fileSystem.createDirectory('test')
            fileSystem.changeDirectory('test')

            const result = executor.execute('pwd')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data).toBe('/test')
            }
        })
    })

    describe('cd command', () => {
        it('should change to root when no args', () => {
            fileSystem.createDirectory('test')
            fileSystem.changeDirectory('test')

            const result = executor.execute('cd')

            expect(result.type).toBe('success')
            expect(fileSystem.getCurrentPath()).toBe('/')
        })

        it('should change directory', () => {
            fileSystem.createDirectory('manifests')

            const result = executor.execute('cd manifests')

            expect(result.type).toBe('success')
            expect(fileSystem.getCurrentPath()).toBe('/manifests')
        })

        it('should return error for non-existent directory', () => {
            const result = executor.execute('cd nonexistent')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain('not found')
            }
        })
    })

    describe('ls command', () => {
        it('should list empty directory', () => {
            const result = executor.execute('ls')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data).toBe('')
            }
        })

        it('should list directory contents', () => {
            fileSystem.createDirectory('examples')
            fileSystem.createDirectory('manifests')

            const result = executor.execute('ls')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data).toContain('examples')
                expect(result.data).toContain('manifests')
            }
        })

        it('should list with -l flag', () => {
            fileSystem.createDirectory('examples')
            fileSystem.createFile('test.yaml')

            const result = executor.execute('ls -l')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                // New format uses formatLongListing: permissions, size, date, name
                expect(result.data).toContain('d---')  // directory permission
                expect(result.data).toContain('examples')  // directory name
                expect(result.data).toContain('----')  // file permission
                expect(result.data).toContain('test.yaml')  // file name
            }
        })

        it('should list specific path', () => {
            fileSystem.createDirectory('examples')
            fileSystem.changeDirectory('examples')
            fileSystem.createFile('pod.yaml')
            fileSystem.changeDirectory('/')

            const result = executor.execute('ls examples')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data).toContain('pod.yaml')
            }
        })
    })

    describe('mkdir command', () => {
        it('should create directory', () => {
            const result = executor.execute('mkdir test')

            expect(result.type).toBe('success')

            const listResult = fileSystem.listDirectory()
            if (listResult.type === 'success') {
                const names = listResult.data.map(n => n.name)
                expect(names).toContain('test')
            }
        })

        it('should return error when name is missing', () => {
            const result = executor.execute('mkdir')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain('missing operand')
            }
        })

        it('should handle -p flag', () => {
            const result = executor.execute('mkdir -p newdir')

            expect(result.type).toBe('success')

            const listResult = fileSystem.listDirectory()
            if (listResult.type === 'success') {
                const names = listResult.data.map(n => n.name)
                expect(names).toContain('newdir')
            }
        })
    })

    describe('touch command', () => {
        it('should create file', () => {
            const result = executor.execute('touch test.yaml')

            expect(result.type).toBe('success')

            const readResult = fileSystem.readFile('test.yaml')
            expect(readResult.type).toBe('success')
        })

        it('should return error when filename is missing', () => {
            const result = executor.execute('touch')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain('missing file operand')
            }
        })
    })

    describe('cat command', () => {
        it('should display file contents', () => {
            fileSystem.createFile('test.yaml', 'Hello World')

            const result = executor.execute('cat test.yaml')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data).toBe('Hello World')
            }
        })

        it('should return error for non-existent file', () => {
            const result = executor.execute('cat nonexistent.yaml')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain('not found')
            }
        })

        it('should return error when filename is missing', () => {
            const result = executor.execute('cat')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain('missing file operand')
            }
        })
    })

    describe('rm command', () => {
        it('should delete file', () => {
            fileSystem.createFile('test.yaml')

            const result = executor.execute('rm test.yaml')

            expect(result.type).toBe('success')

            const readResult = fileSystem.readFile('test.yaml')
            expect(readResult.type).toBe('error')
        })

        it('should delete directory with -r flag', () => {
            fileSystem.createDirectory('testdir')

            const result = executor.execute('rm -r testdir')

            expect(result.type).toBe('success')

            const cdResult = fileSystem.changeDirectory('testdir')
            expect(cdResult.type).toBe('error')
        })

        it('should return error when operand is missing', () => {
            const result = executor.execute('rm')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain('missing operand')
            }
        })
    })

    describe('clear command', () => {
        it('should return clear signal', () => {
            const result = executor.execute('clear')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data).toBe('')
            }
        })
    })

    describe('help command', () => {
        it('should return help text', () => {
            const result = executor.execute('help')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data).toContain('Available shell commands')
                expect(result.data).toContain('cd')
                expect(result.data).toContain('ls')
                expect(result.data).toContain('pwd')
                expect(result.data).toContain('mkdir')
                expect(result.data).toContain('touch')
                expect(result.data).toContain('cat')
                expect(result.data).toContain('rm')
                expect(result.data).toContain('clear')
                expect(result.data).toContain('help')
            }
        })
    })

    describe('error handling', () => {
        it('should handle parser errors', () => {
            const result = executor.execute('')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain('empty')
            }
        })

        it('should handle unknown commands', () => {
            const result = executor.execute('invalid')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain('Unknown command')
            }
        })

        it('should display full command in error message for unknown commands', () => {
            const result = executor.execute('qsdfjmql ksjfl mqks')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toBe('Unknown command: qsdfjmql ksjfl mqks')
            }
        })
    })

    describe('debug command', () => {
        it('should list all available images with debug images', () => {
            const result = executor.execute('debug images')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data).toContain('Available Container Images')
                expect(result.data).toContain('nginx')
                expect(result.data).toContain('redis')
                expect(result.data).toContain('postgres')
            }
        })

        it('should show image details including tags and ports', () => {
            const result = executor.execute('debug images')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data).toContain('Tags:')
                expect(result.data).toContain('Ports:')
                expect(result.data).toContain('Status:')
            }
        })

        it('should show usage message for debug without args', () => {
            const result = executor.execute('debug')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data).toContain('debug images')
                expect(result.data).toContain('debug logs')
                expect(result.data).toContain('debug clear')
            }
        })

        it('should show application logs with debug logs', () => {
            // Execute some commands to generate logs
            executor.execute('pwd')
            executor.execute('ls')

            const result = executor.execute('debug logs')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data).toContain('Application Logs')
                expect(result.data).toContain('Shell: pwd')
                expect(result.data).toContain('Shell: ls')
            }
        })

        it('should clear application logs with debug clear', () => {
            // Generate some logs
            executor.execute('pwd')

            // Verify logs exist
            let entries = logger.getEntries()
            expect(entries.length).toBeGreaterThan(0)

            // Clear logs
            const result = executor.execute('debug clear')

            expect(result.type).toBe('success')
            if (result.type === 'success') {
                expect(result.data).toContain('cleared')
            }

            // Verify logs were cleared
            entries = logger.getEntries()
            expect(entries.length).toBe(0)
        })

        it('should return error for unknown debug subcommand', () => {
            const result = executor.execute('debug unknown')

            expect(result.type).toBe('error')
            if (result.type === 'error') {
                expect(result.message).toContain('Unknown debug subcommand')
            }
        })
    })

    describe('logger integration', () => {
        it('should log command execution', () => {
            executor.execute('pwd')

            const entries = logger.getEntries({ category: 'COMMAND' })
            expect(entries.length).toBeGreaterThan(0)
            expect(entries.some(e => e.message.includes('Shell: pwd'))).toBe(true)
        })

        it('should log filesystem operations', () => {
            executor.execute('mkdir testdir')

            const entries = logger.getEntries({ category: 'FILESYSTEM' })
            expect(entries.length).toBeGreaterThan(0)
            expect(entries.some(e => e.message.includes('Creating directory'))).toBe(true)
        })

        it('should log errors', () => {
            executor.execute('cd nonexistent')

            const entries = logger.getEntries({ level: 'error' })
            expect(entries.length).toBeGreaterThan(0)
        })
    })
})


