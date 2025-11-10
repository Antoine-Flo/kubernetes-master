import { describe, expect, it } from 'vitest'
import { createPod } from '../../../../src/cluster/ressources/Pod'
import { reconcileInitContainers } from '../../../../src/cluster/initContainers/reconciler'
import type { Container } from '../../../../src/cluster/ressources/Pod'
import { createFileSystem } from '../../../../src/filesystem/FileSystem'

describe('Init Container Reconciler', () => {
    describe('reconcileInitContainers', () => {
        it('should return pod unchanged if no init containers', () => {
            const containers: Container[] = [
                { name: 'nginx', image: 'nginx:latest' },
            ]

            const pod = createPod({
                name: 'no-init-pod',
                namespace: 'default',
                containers,
            })

            const reconciledPod = reconcileInitContainers(pod)

            expect(reconciledPod.status.phase).toBe('Running')
            expect(reconciledPod.spec.initContainers).toBeUndefined()
        })

        it('should execute single init container and mark as Terminated', () => {
            const initContainers: Container[] = [
                {
                    name: 'init-setup',
                    image: 'busybox:latest',
                    command: ['touch'],
                    args: ['/tmp/ready'],
                },
            ]
            const containers: Container[] = [
                { name: 'nginx', image: 'nginx:latest' },
            ]

            const pod = createPod({
                name: 'init-pod',
                namespace: 'default',
                initContainers,
                containers,
            })

            const reconciledPod = reconcileInitContainers(pod)

            expect(reconciledPod.status.phase).toBe('Running')

            const initStatus = reconciledPod.status.containerStatuses?.find(cs => cs.name === 'init-setup')
            expect(initStatus?.state).toBe('Terminated')
            expect(initStatus?.containerType).toBe('init')

            // Verify file was created
            const fs = createFileSystem(initStatus!.fileSystem)
            const fileResult = fs.readFile('/tmp/ready')
            expect(fileResult.ok).toBe(true)
        })

        it('should execute multiple init containers sequentially', () => {
            const initContainers: Container[] = [
                {
                    name: 'init-1',
                    image: 'busybox:latest',
                    command: ['touch'],
                    args: ['/tmp/init1-done'],
                },
                {
                    name: 'init-2',
                    image: 'busybox:latest',
                    command: ['touch'],
                    args: ['/tmp/init2-done'],
                },
            ]
            const containers: Container[] = [
                { name: 'nginx', image: 'nginx:latest' },
            ]

            const pod = createPod({
                name: 'multi-init-pod',
                namespace: 'default',
                initContainers,
                containers,
            })

            const reconciledPod = reconcileInitContainers(pod)

            expect(reconciledPod.status.phase).toBe('Running')

            const init1Status = reconciledPod.status.containerStatuses?.find(cs => cs.name === 'init-1')
            const init2Status = reconciledPod.status.containerStatuses?.find(cs => cs.name === 'init-2')

            expect(init1Status?.state).toBe('Terminated')
            expect(init2Status?.state).toBe('Terminated')

            // Verify both files exist in their respective containers
            const fs1 = createFileSystem(init1Status!.fileSystem)
            const fs2 = createFileSystem(init2Status!.fileSystem)

            expect(fs1.readFile('/tmp/init1-done').ok).toBe(true)
            expect(fs2.readFile('/tmp/init2-done').ok).toBe(true)
        })

        it('should fail pod if init container has invalid image', () => {
            const initContainers: Container[] = [
                {
                    name: 'init-bad',
                    image: 'invalid-image:latest',
                    command: ['touch'],
                    args: ['/tmp/ready'],
                },
            ]
            const containers: Container[] = [
                { name: 'nginx', image: 'nginx:latest' },
            ]

            const pod = createPod({
                name: 'bad-init-pod',
                namespace: 'default',
                initContainers,
                containers,
            })

            const reconciledPod = reconcileInitContainers(pod)

            expect(reconciledPod.status.phase).toBe('Failed')

            const initStatus = reconciledPod.status.containerStatuses?.find(cs => cs.name === 'init-bad')
            expect(initStatus?.state).toBe('Terminated')
        })

        it('should fail pod if init container command fails', () => {
            const initContainers: Container[] = [
                {
                    name: 'init-fail',
                    image: 'busybox:latest',
                    command: ['invalidcommand'],
                    args: ['arg1'],
                },
            ]
            const containers: Container[] = [
                { name: 'nginx', image: 'nginx:latest' },
            ]

            const pod = createPod({
                name: 'fail-cmd-pod',
                namespace: 'default',
                initContainers,
                containers,
            })

            const reconciledPod = reconcileInitContainers(pod)

            expect(reconciledPod.status.phase).toBe('Failed')

            const initStatus = reconciledPod.status.containerStatuses?.find(cs => cs.name === 'init-fail')
            expect(initStatus?.state).toBe('Terminated')
        })

        it('should stop executing init containers after first failure', () => {
            const initContainers: Container[] = [
                {
                    name: 'init-1',
                    image: 'busybox:latest',
                    command: ['invalidcommand'],
                },
                {
                    name: 'init-2',
                    image: 'busybox:latest',
                    command: ['touch'],
                    args: ['/tmp/ready'],
                },
            ]
            const containers: Container[] = [
                { name: 'nginx', image: 'nginx:latest' },
            ]

            const pod = createPod({
                name: 'fail-early-pod',
                namespace: 'default',
                initContainers,
                containers,
            })

            const reconciledPod = reconcileInitContainers(pod)

            expect(reconciledPod.status.phase).toBe('Failed')

            const init1Status = reconciledPod.status.containerStatuses?.find(cs => cs.name === 'init-1')
            const init2Status = reconciledPod.status.containerStatuses?.find(cs => cs.name === 'init-2')

            expect(init1Status?.state).toBe('Terminated')
            // init-2 should still be in Waiting state since init-1 failed
            expect(init2Status?.state).toBe('Waiting')
        })

        it('should mark regular containers as Running when all init containers succeed', () => {
            const initContainers: Container[] = [
                {
                    name: 'init-setup',
                    image: 'busybox:latest',
                    command: ['touch'],
                    args: ['/tmp/ready'],
                },
            ]
            const containers: Container[] = [
                { name: 'nginx', image: 'nginx:latest' },
                { name: 'sidecar', image: 'busybox:latest' },
            ]

            const pod = createPod({
                name: 'full-pod',
                namespace: 'default',
                initContainers,
                containers,
            })

            const reconciledPod = reconcileInitContainers(pod)

            expect(reconciledPod.status.phase).toBe('Running')

            const nginxStatus = reconciledPod.status.containerStatuses?.find(cs => cs.name === 'nginx')
            const sidecarStatus = reconciledPod.status.containerStatuses?.find(cs => cs.name === 'sidecar')

            expect(nginxStatus?.state).toBe('Running')
            expect(nginxStatus?.ready).toBe(true)
            expect(sidecarStatus?.state).toBe('Running')
            expect(sidecarStatus?.ready).toBe(true)
        })
    })
})

