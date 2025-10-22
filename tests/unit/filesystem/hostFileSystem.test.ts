import { describe, expect, it } from 'vitest'
import { createHostFileSystem, debianFileSystem } from '../../../src/filesystem/debianFileSystem'
import { createFileSystem } from '../../../src/filesystem/FileSystem'

describe('Host vs Container Filesystem', () => {
    describe('createHostFileSystem', () => {
        it('should create host filesystem with kube user', () => {
            const hostFs = createHostFileSystem()
            
            // Should start in kube home
            expect(hostFs.currentPath).toBe('/home/kube')
            
            // Should have kube user in passwd
            const passwdFile = hostFs.tree.children.get('etc')?.children.get('passwd')
            expect(passwdFile?.type).toBe('file')
            if (passwdFile?.type === 'file') {
                expect(passwdFile.content).toContain('kube:x:1000:1000:kube:/home/kube:/bin/bash')
            }
        })

        it('should have kube home directory', () => {
            const hostFs = createHostFileSystem()
            
            const homeDir = hostFs.tree.children.get('home')
            expect(homeDir?.type).toBe('directory')
            
            if (homeDir?.type === 'directory') {
                expect(homeDir.children.has('kube')).toBe(true)
                
                const kubeHome = homeDir.children.get('kube')
                expect(kubeHome?.type).toBe('directory')
                expect(kubeHome?.path).toBe('/home/kube')
            }
        })

        it('should have examples directory in kube home', () => {
            const hostFs = createHostFileSystem()
            
            const kubeHome = hostFs.tree.children.get('home')?.children.get('kube')
            expect(kubeHome?.type).toBe('directory')
            
            if (kubeHome?.type === 'directory') {
                expect(kubeHome.children.has('examples')).toBe(true)
                
                const examplesDir = kubeHome.children.get('examples')
                expect(examplesDir?.type).toBe('directory')
                expect(examplesDir?.path).toBe('/home/kube/examples')
            }
        })

        it('should have example files in kube home examples', () => {
            const hostFs = createHostFileSystem()
            const fs = createFileSystem(hostFs)
            
            const listResult = fs.listDirectory('examples')
            expect(listResult.ok).toBe(true)
            
            if (listResult.ok) {
                const fileNames = listResult.value.map(node => node.name)
                expect(fileNames).toContain('pod-example.yaml')
                expect(fileNames).toContain('deployment-example.yml')
                expect(fileNames).toContain('service-example.json')
            }
        })
    })

    describe('debianFileSystem (for containers)', () => {
        it('should create container filesystem without kube user', () => {
            const containerFs = debianFileSystem()
            
            // Should start at root
            expect(containerFs.currentPath).toBe('/')
            
            // Should NOT have kube user in passwd
            const passwdFile = containerFs.tree.children.get('etc')?.children.get('passwd')
            expect(passwdFile?.type).toBe('file')
            if (passwdFile?.type === 'file') {
                expect(passwdFile.content).not.toContain('kube:x:1000:1000:kube:/home/kube:/bin/bash')
                expect(passwdFile.content).toBe('root:x:0:0:root:/root:/bin/bash')
            }
        })

        it('should NOT have kube home directory', () => {
            const containerFs = debianFileSystem()
            
            const homeDir = containerFs.tree.children.get('home')
            expect(homeDir?.type).toBe('directory')
            
            if (homeDir?.type === 'directory') {
                expect(homeDir.children.has('kube')).toBe(false)
            }
        })

        it('should NOT have examples directory', () => {
            const containerFs = debianFileSystem()
            
            // Root should not have examples
            expect(containerFs.tree.children.has('examples')).toBe(false)
            
            // Home should not have examples
            const homeDir = containerFs.tree.children.get('home')
            if (homeDir?.type === 'directory') {
                expect(homeDir.children.has('examples')).toBe(false)
            }
        })
    })

    describe('isolation between host and containers', () => {
        it('should have different filesystem instances', () => {
            const hostFs = createHostFileSystem()
            const containerFs = debianFileSystem()
            
            // Should be different instances
            expect(hostFs).not.toBe(containerFs)
            expect(hostFs.tree).not.toBe(containerFs.tree)
        })

        it('should have different current paths', () => {
            const hostFs = createHostFileSystem()
            const containerFs = debianFileSystem()
            
            expect(hostFs.currentPath).toBe('/home/kube')
            expect(containerFs.currentPath).toBe('/')
        })

        it('should have different passwd files', () => {
            const hostFs = createHostFileSystem()
            const containerFs = debianFileSystem()
            
            const hostPasswd = hostFs.tree.children.get('etc')?.children.get('passwd')
            const containerPasswd = containerFs.tree.children.get('etc')?.children.get('passwd')
            
            expect(hostPasswd).not.toBe(containerPasswd)
            
            if (hostPasswd?.type === 'file' && containerPasswd?.type === 'file') {
                expect(hostPasswd.content).not.toBe(containerPasswd.content)
                expect(hostPasswd.content).toContain('kube:x:1000:1000:kube:/home/kube:/bin/bash')
                expect(containerPasswd.content).not.toContain('kube:x:1000:1000:kube:/home/kube:/bin/bash')
            }
        })
    })
})
