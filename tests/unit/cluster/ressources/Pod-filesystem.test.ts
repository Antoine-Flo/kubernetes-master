import { describe, expect, it } from 'vitest'
import { createPod, getContainerFileSystem, updateContainerFileSystem } from '../../../../src/cluster/ressources/Pod'
import { createFileSystem } from '../../../../src/filesystem/FileSystem'

describe('Pod Filesystem Integration', () => {
    describe('createPod', () => {
        it('should initialize filesystem for each container', () => {
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [
                    { name: 'nginx', image: 'nginx:latest' },
                    { name: 'redis', image: 'redis:latest' }
                ]
            })

            expect(pod.status.containerStatuses).toBeDefined()
            expect(pod.status.containerStatuses).toHaveLength(2)

            const nginxStatus = pod.status.containerStatuses?.find(cs => cs.name === 'nginx')
            const redisStatus = pod.status.containerStatuses?.find(cs => cs.name === 'redis')

            expect(nginxStatus?.fileSystem).toBeDefined()
            expect(redisStatus?.fileSystem).toBeDefined()
            expect(nginxStatus?.fileSystem).not.toBe(redisStatus?.fileSystem) // Different instances
        })

        it('should have Linux filesystem structure in containers', () => {
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }]
            })

            const containerFs = getContainerFileSystem(pod, 'nginx')
            expect(containerFs).toBeDefined()

            if (containerFs) {
                const fs = createFileSystem(containerFs)
                const listResult = fs.listDirectory()
                
                expect(listResult.ok).toBe(true)
                if (listResult.ok) {
                    const dirNames = listResult.value.map(node => node.name)
                    expect(dirNames).toContain('bin')
                    expect(dirNames).toContain('etc')
                    expect(dirNames).toContain('var')
                    expect(dirNames).toContain('usr')
                    expect(dirNames).toContain('home')
                    expect(dirNames).toContain('root')
                    expect(dirNames).toContain('tmp')
                }
            }
        })

        it('should have simulated binaries in container filesystem', () => {
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }]
            })

            const containerFs = getContainerFileSystem(pod, 'nginx')
            expect(containerFs).toBeDefined()

            if (containerFs) {
                const fs = createFileSystem(containerFs)
                const binListResult = fs.listDirectory('/bin')
                
                expect(binListResult.ok).toBe(true)
                if (binListResult.ok) {
                    const binNames = binListResult.value.map(node => node.name)
                    expect(binNames).toContain('sh')
                    expect(binNames).toContain('bash')
                    expect(binNames).toContain('ls')
                    expect(binNames).toContain('cat')
                    expect(binNames).toContain('grep')
                    expect(binNames).toContain('ps')
                    expect(binNames).toContain('env')
                }
            }
        })

        it('should NOT have examples directory in container filesystem', () => {
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }]
            })

            const containerFs = getContainerFileSystem(pod, 'nginx')
            expect(containerFs).toBeDefined()

            if (containerFs) {
                const fs = createFileSystem(containerFs)
                const listResult = fs.listDirectory()
                
                expect(listResult.ok).toBe(true)
                if (listResult.ok) {
                    const dirNames = listResult.value.map(node => node.name)
                    expect(dirNames).not.toContain('examples')
                }
            }
        })
    })

    describe('getContainerFileSystem', () => {
        it('should return filesystem for existing container', () => {
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }]
            })

            const containerFs = getContainerFileSystem(pod, 'nginx')
            expect(containerFs).toBeDefined()
            expect(containerFs?.currentPath).toBe('/')
        })

        it('should return undefined for non-existent container', () => {
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }]
            })

            const containerFs = getContainerFileSystem(pod, 'nonexistent')
            expect(containerFs).toBeUndefined()
        })
    })

    describe('updateContainerFileSystem', () => {
        it('should update filesystem for specific container', () => {
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [
                    { name: 'nginx', image: 'nginx:latest' },
                    { name: 'redis', image: 'redis:latest' }
                ]
            })

            const nginxFs = getContainerFileSystem(pod, 'nginx')
            expect(nginxFs).toBeDefined()

            if (nginxFs) {
                const fs = createFileSystem(nginxFs)
                fs.createFile('test.txt', 'test content')

                const updatedPod = updateContainerFileSystem(pod, 'nginx', fs.toJSON())
                const updatedNginxFs = getContainerFileSystem(updatedPod, 'nginx')

                expect(updatedNginxFs).toBeDefined()
                if (updatedNginxFs) {
                    const updatedFs = createFileSystem(updatedNginxFs)
                    const readResult = updatedFs.readFile('test.txt')
                    expect(readResult.ok).toBe(true)
                    if (readResult.ok) {
                        expect(readResult.value).toBe('test content')
                    }
                }
            }
        })

        it('should not affect other containers when updating one', () => {
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [
                    { name: 'nginx', image: 'nginx:latest' },
                    { name: 'redis', image: 'redis:latest' }
                ]
            })

            const nginxFs = getContainerFileSystem(pod, 'nginx')
            const redisFs = getContainerFileSystem(pod, 'redis')

            expect(nginxFs).toBeDefined()
            expect(redisFs).toBeDefined()

            if (nginxFs) {
                const fs = createFileSystem(nginxFs)
                fs.createFile('nginx-only.txt', 'nginx content')

                const updatedPod = updateContainerFileSystem(pod, 'nginx', fs.toJSON())
                const updatedRedisFs = getContainerFileSystem(updatedPod, 'redis')

                // Redis filesystem should be unchanged
                expect(updatedRedisFs).toEqual(redisFs)

                // Verify redis doesn't have the nginx file
                if (updatedRedisFs) {
                    const redisFileSystem = createFileSystem(updatedRedisFs)
                    const readResult = redisFileSystem.readFile('nginx-only.txt')
                    expect(readResult.ok).toBe(false)
                }
            }
        })
    })

    describe('isolation', () => {
        it('should have isolated filesystems between containers', () => {
            const pod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [
                    { name: 'nginx', image: 'nginx:latest' },
                    { name: 'redis', image: 'redis:latest' }
                ]
            })

            const nginxFs = getContainerFileSystem(pod, 'nginx')
            const redisFs = getContainerFileSystem(pod, 'redis')

            expect(nginxFs).toBeDefined()
            expect(redisFs).toBeDefined()

            // They should be different instances
            expect(nginxFs).not.toBe(redisFs)

            if (nginxFs && redisFs) {
                const nginxFileSystem = createFileSystem(nginxFs)
                const redisFileSystem = createFileSystem(redisFs)

                // Create file in nginx
                nginxFileSystem.createFile('nginx-file.txt', 'nginx content')

                // Redis should not have this file
                const redisReadResult = redisFileSystem.readFile('nginx-file.txt')
                expect(redisReadResult.ok).toBe(false)
            }
        })
    })
})
