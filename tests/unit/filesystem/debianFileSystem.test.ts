import { describe, expect, it } from 'vitest'
import { debianFileSystem } from '../../../src/filesystem/debianFileSystem'
import { createFileSystem } from '../../../src/filesystem/FileSystem'

describe('debianFileSystem', () => {
    describe('basic structure', () => {
        it('should create a new filesystem instance each time', () => {
            const fs1 = debianFileSystem()
            const fs2 = debianFileSystem()
            
            // Should be different instances
            expect(fs1).not.toBe(fs2)
            expect(fs1.tree).not.toBe(fs2.tree)
        })

        it('should have root directory as current path', () => {
            const fs = debianFileSystem()
            expect(fs.currentPath).toBe('/')
        })

        it('should have correct Linux directory structure', () => {
            const fs = debianFileSystem()
            const root = fs.tree

            // Check main directories exist
            expect(root.children.has('bin')).toBe(true)
            expect(root.children.has('etc')).toBe(true)
            expect(root.children.has('home')).toBe(true)
            expect(root.children.has('root')).toBe(true)
            expect(root.children.has('tmp')).toBe(true)
            expect(root.children.has('var')).toBe(true)
            expect(root.children.has('usr')).toBe(true)
        })

        it('should have correct subdirectory structure', () => {
            const fs = debianFileSystem()
            const root = fs.tree

            // Check /var subdirectories
            const varDir = root.children.get('var')
            expect(varDir?.type).toBe('directory')
            if (varDir?.type === 'directory') {
                expect(varDir.children.has('log')).toBe(true)
                expect(varDir.children.has('run')).toBe(true)
            }

            // Check /usr subdirectories
            const usrDir = root.children.get('usr')
            expect(usrDir?.type).toBe('directory')
            if (usrDir?.type === 'directory') {
                expect(usrDir.children.has('bin')).toBe(true)
                expect(usrDir.children.has('local')).toBe(true)
                expect(usrDir.children.has('lib')).toBe(true)
            }
        })
    })

    describe('simulated binaries', () => {
        it('should have simulated binaries in /bin', () => {
            const fs = debianFileSystem()
            const binDir = fs.tree.children.get('bin')
            
            expect(binDir?.type).toBe('directory')
            if (binDir?.type === 'directory') {
                expect(binDir.children.has('sh')).toBe(true)
                expect(binDir.children.has('bash')).toBe(true)
                expect(binDir.children.has('ls')).toBe(true)
                expect(binDir.children.has('cat')).toBe(true)
                expect(binDir.children.has('grep')).toBe(true)
                expect(binDir.children.has('ps')).toBe(true)
                expect(binDir.children.has('env')).toBe(true)
            }
        })

        it('should have correct content for simulated binaries', () => {
            const fs = debianFileSystem()
            const binDir = fs.tree.children.get('bin')
            
            if (binDir?.type === 'directory') {
                const shBinary = binDir.children.get('sh')
                expect(shBinary?.type).toBe('file')
                if (shBinary?.type === 'file') {
                    expect(shBinary.content).toContain('#!/bin/sh')
                    expect(shBinary.content).toContain('Simulated shell binary')
                }

                const bashBinary = binDir.children.get('bash')
                expect(bashBinary?.type).toBe('file')
                if (bashBinary?.type === 'file') {
                    expect(bashBinary.content).toContain('#!/bin/bash')
                    expect(bashBinary.content).toContain('Simulated bash binary')
                }
            }
        })
    })

    describe('system configuration files', () => {
        it('should have system config files in /etc', () => {
            const fs = debianFileSystem()
            const etcDir = fs.tree.children.get('etc')
            
            expect(etcDir?.type).toBe('directory')
            if (etcDir?.type === 'directory') {
                expect(etcDir.children.has('hostname')).toBe(true)
                expect(etcDir.children.has('hosts')).toBe(true)
                expect(etcDir.children.has('passwd')).toBe(true)
                expect(etcDir.children.has('resolv.conf')).toBe(true)
            }
        })

        it('should have correct content for config files', () => {
            const fs = debianFileSystem()
            const etcDir = fs.tree.children.get('etc')
            
            if (etcDir?.type === 'directory') {
                const hostnameFile = etcDir.children.get('hostname')
                expect(hostnameFile?.type).toBe('file')
                if (hostnameFile?.type === 'file') {
                    expect(hostnameFile.content).toBe('container-hostname')
                }

                const hostsFile = etcDir.children.get('hosts')
                expect(hostsFile?.type).toBe('file')
                if (hostsFile?.type === 'file') {
                    expect(hostsFile.content).toContain('127.0.0.1')
                    expect(hostsFile.content).toContain('localhost')
                }

                const passwdFile = etcDir.children.get('passwd')
                expect(passwdFile?.type).toBe('file')
                if (passwdFile?.type === 'file') {
                    expect(passwdFile.content).toContain('root:x:0:0:root:/root:/bin/bash')
                }

                const resolvConfFile = etcDir.children.get('resolv.conf')
                expect(resolvConfFile?.type).toBe('file')
                if (resolvConfFile?.type === 'file') {
                    expect(resolvConfFile.content).toContain('nameserver 8.8.8.8')
                }
            }
        })
    })

    describe('isolation', () => {
        it('should create isolated filesystem instances', () => {
            const fs1 = debianFileSystem()
            const fs2 = debianFileSystem()

            // Modify fs1
            const fileSystem1 = createFileSystem(fs1)
            fileSystem1.createFile('test.txt', 'content1')

            // Modify fs2
            const fileSystem2 = createFileSystem(fs2)
            fileSystem2.createFile('test.txt', 'content2')

            // Check they are isolated
            const result1 = fileSystem1.readFile('test.txt')
            const result2 = fileSystem2.readFile('test.txt')

            expect(result1.ok).toBe(true)
            expect(result2.ok).toBe(true)
            if (result1.ok && result2.ok) {
                expect(result1.value).toBe('content1')
                expect(result2.value).toBe('content2')
            }
        })
    })
})

