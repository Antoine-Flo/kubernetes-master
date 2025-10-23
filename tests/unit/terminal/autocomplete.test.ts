import { beforeEach, describe, expect, it } from 'vitest'
import { createClusterState } from '../../../src/cluster/ClusterState'
import { createEventBus } from '../../../src/cluster/events/EventBus'
import { createPod } from '../../../src/cluster/ressources/Pod'
import { createConfigMap } from '../../../src/cluster/ressources/ConfigMap'
import { createSecret } from '../../../src/cluster/ressources/Secret'
import { createFileSystem } from '../../../src/filesystem/FileSystem'
import { formatSuggestions, getCommonPrefix, getCompletions, type AutocompleteContext } from '../../../src/terminal/autocomplete'

describe('Autocomplete', () => {
    let context: AutocompleteContext

    beforeEach(() => {
        const eventBus = createEventBus()
        const clusterState = createClusterState(eventBus)

        // Add test pods
        clusterState.addPod(createPod({
            name: 'nginx-1',
            namespace: 'default',
            containers: [{ name: 'nginx', image: 'nginx:latest' }]
        }))
        clusterState.addPod(createPod({
            name: 'nginx-2',
            namespace: 'default',
            containers: [{ name: 'nginx', image: 'nginx:latest' }]
        }))
        clusterState.addPod(createPod({
            name: 'redis-1',
            namespace: 'default',
            containers: [{ name: 'redis', image: 'redis:latest' }]
        }))

        // Add test configmaps
        clusterState.addConfigMap(createConfigMap({
            name: 'app-config',
            namespace: 'default',
            data: { key: 'value' }
        }))

        // Add test secrets
        clusterState.addSecret(createSecret({
            name: 'db-secret',
            namespace: 'default',
            secretType: { type: 'Opaque' },
            data: { password: 'secret' }
        }))

        const fileSystem = createFileSystem({
            currentPath: '/',
            tree: {
                type: 'directory',
                name: '/',
                path: '/',
                children: new Map([
                    ['manifests', {
                        type: 'directory',
                        name: 'manifests',
                        path: '/manifests',
                        children: new Map([
                            ['pod.yaml', {
                                type: 'file',
                                name: 'pod.yaml',
                                path: '/manifests/pod.yaml',
                                content: '',
                                createdAt: new Date().toISOString(),
                                modifiedAt: new Date().toISOString()
                            }],
                            ['deployment.yaml', {
                                type: 'file',
                                name: 'deployment.yaml',
                                path: '/manifests/deployment.yaml',
                                content: '',
                                createdAt: new Date().toISOString(),
                                modifiedAt: new Date().toISOString()
                            }]
                        ])
                    }],
                    ['examples', {
                        type: 'directory',
                        name: 'examples',
                        path: '/examples',
                        children: new Map()
                    }]
                ])
            }
        })

        context = { clusterState, fileSystem }
    })

    describe('getCommonPrefix', () => {
        it('returns empty string for empty array', () => {
            expect(getCommonPrefix([])).toBe('')
        })

        it('returns the single item if array has one element', () => {
            expect(getCommonPrefix(['kubectl'])).toBe('kubectl')
        })

        it('returns common prefix for multiple items', () => {
            expect(getCommonPrefix(['kubectl', 'kube'])).toBe('kube')
        })

        it('returns longest common prefix', () => {
            expect(getCommonPrefix(['nginx-1', 'nginx-2', 'nginx-3'])).toBe('nginx-')
        })

        it('returns empty string if no common prefix', () => {
            expect(getCommonPrefix(['kubectl', 'cd', 'ls'])).toBe('')
        })

        it('handles partial matches correctly', () => {
            expect(getCommonPrefix(['pods', 'pod'])).toBe('pod')
        })
    })

    describe('formatSuggestions', () => {
        it('formats single suggestion', () => {
            const result = formatSuggestions(['kubectl'])
            expect(result).toBe('kubectl')
        })

        it('formats multiple suggestions in columns', () => {
            const result = formatSuggestions(['kubectl', 'cd', 'ls', 'pwd'])
            expect(result).toContain('kubectl')
            expect(result).toContain('cd')
            expect(result).toContain('ls')
            expect(result).toContain('pwd')
        })

        it('formats empty array as empty string', () => {
            expect(formatSuggestions([])).toBe('')
        })
    })

    describe('Command Completion', () => {
        it('completes kubectl from empty line', () => {
            const completions = getCompletions('', context)
            expect(completions).toContain('kubectl')
        })

        it('completes kubectl from partial k', () => {
            const completions = getCompletions('k', context)
            expect(completions).toContain('kubectl')
        })

        it('completes kubectl from partial kub', () => {
            const completions = getCompletions('kub', context)
            expect(completions).toEqual(['kubectl'])
        })

        it('completes shell commands from empty line', () => {
            const completions = getCompletions('', context)
            expect(completions).toContain('cd')
            expect(completions).toContain('ls')
            expect(completions).toContain('pwd')
            expect(completions).toContain('cat')
            expect(completions).toContain('nano')
        })

        it('completes cd from partial c', () => {
            const completions = getCompletions('c', context)
            expect(completions).toContain('cd')
            expect(completions).toContain('cat')
            expect(completions).toContain('clear')
        })

        it('completes ls from partial l', () => {
            const completions = getCompletions('l', context)
            expect(completions).toEqual(['ls'])
        })

        it('returns empty array for unknown command prefix', () => {
            const completions = getCompletions('xyz', context)
            expect(completions).toEqual([])
        })
    })

    describe('Kubectl Action Completion', () => {
        it('completes actions after kubectl', () => {
            const completions = getCompletions('kubectl ', context)
            expect(completions).toContain('get')
            expect(completions).toContain('describe')
            expect(completions).toContain('delete')
            expect(completions).toContain('apply')
            expect(completions).toContain('logs')
            expect(completions).toContain('exec')
        })

        it('completes get from kubectl g', () => {
            const completions = getCompletions('kubectl g', context)
            expect(completions).toEqual(['get'])
        })

        it('completes describe and delete from kubectl d', () => {
            const completions = getCompletions('kubectl d', context)
            expect(completions).toContain('describe')
            expect(completions).toContain('delete')
        })

        it('completes apply from kubectl a', () => {
            const completions = getCompletions('kubectl a', context)
            expect(completions).toEqual(['apply'])
        })

        it('completes logs from kubectl lo', () => {
            const completions = getCompletions('kubectl lo', context)
            expect(completions).toContain('logs')
        })

        it('completes exec from kubectl e', () => {
            const completions = getCompletions('kubectl e', context)
            expect(completions).toContain('exec')
        })
    })

    describe('Resource Type Completion', () => {
        it('completes resource types after kubectl get', () => {
            const completions = getCompletions('kubectl get ', context)
            expect(completions).toContain('pods')
            expect(completions).toContain('pod')
            expect(completions).toContain('po')
            expect(completions).toContain('configmaps')
            expect(completions).toContain('configmap')
            expect(completions).toContain('cm')
            expect(completions).toContain('secrets')
            expect(completions).toContain('secret')
        })

        it('completes pods from kubectl get p', () => {
            const completions = getCompletions('kubectl get p', context)
            expect(completions).toContain('pods')
            expect(completions).toContain('pod')
            expect(completions).toContain('po')
        })

        it('completes pod aliases from kubectl get po', () => {
            const completions = getCompletions('kubectl get po', context)
            expect(completions).toContain('pods')
            expect(completions).toContain('pod')
        })

        it('completes configmaps from kubectl get c', () => {
            const completions = getCompletions('kubectl get c', context)
            expect(completions).toContain('configmaps')
            expect(completions).toContain('configmap')
            expect(completions).toContain('cm')
        })

        it('completes secrets from kubectl get s', () => {
            const completions = getCompletions('kubectl get s', context)
            expect(completions).toContain('secrets')
            expect(completions).toContain('secret')
        })

        it('completes resource types after kubectl describe', () => {
            const completions = getCompletions('kubectl describe ', context)
            expect(completions).toContain('pods')
            expect(completions).toContain('configmaps')
            expect(completions).toContain('secrets')
        })
    })

    describe('Resource Name Completion', () => {
        it('completes pod names after kubectl get pods', () => {
            const completions = getCompletions('kubectl get pods ', context)
            expect(completions).toContain('nginx-1')
            expect(completions).toContain('nginx-2')
            expect(completions).toContain('redis-1')
        })

        it('completes pod names with partial match', () => {
            const completions = getCompletions('kubectl get pods n', context)
            expect(completions).toContain('nginx-1')
            expect(completions).toContain('nginx-2')
            expect(completions).not.toContain('redis-1')
        })

        it('completes pod names after kubectl describe pod', () => {
            const completions = getCompletions('kubectl describe pod ', context)
            expect(completions).toContain('nginx-1')
            expect(completions).toContain('nginx-2')
            expect(completions).toContain('redis-1')
        })

        it('completes pod names after kubectl delete pod', () => {
            const completions = getCompletions('kubectl delete pod ', context)
            expect(completions).toContain('nginx-1')
            expect(completions).toContain('nginx-2')
            expect(completions).toContain('redis-1')
        })

        it('completes specific pod name from partial', () => {
            const completions = getCompletions('kubectl get pods nginx-', context)
            expect(completions).toContain('nginx-1')
            expect(completions).toContain('nginx-2')
        })

        it('completes configmap names after kubectl get configmaps', () => {
            const completions = getCompletions('kubectl get configmaps ', context)
            expect(completions).toContain('app-config')
        })

        it('completes secret names after kubectl get secrets', () => {
            const completions = getCompletions('kubectl get secrets ', context)
            expect(completions).toContain('db-secret')
        })
    })

    describe('File Path Completion', () => {
        it('completes directory names after cd', () => {
            const completions = getCompletions('cd ', context)
            expect(completions).toContain('manifests')
            expect(completions).toContain('examples')
        })

        it('cd only suggests directories, not files', () => {
            context.fileSystem.changeDirectory('/manifests')
            const completions = getCompletions('cd ', context)
            expect(completions).toEqual([])
            expect(completions).not.toContain('pod.yaml')
        })

        it('completes directory names with partial match', () => {
            const completions = getCompletions('cd m', context)
            expect(completions).toEqual(['manifests'])
        })

        it('completes both files and directories after ls', () => {
            const completions = getCompletions('ls ', context)
            expect(completions).toContain('manifests')
            expect(completions).toContain('examples')
        })

        it('completes files after cat', () => {
            context.fileSystem.changeDirectory('/manifests')
            const completions = getCompletions('cat ', context)
            expect(completions).toContain('pod.yaml')
            expect(completions).toContain('deployment.yaml')
        })

        it('cat suggests files in current directory', () => {
            context.fileSystem.changeDirectory('/manifests')
            const completions = getCompletions('cat ', context)
            expect(completions).toContain('pod.yaml')
            expect(completions).not.toContain('manifests')
        })

        it('completes files after nano', () => {
            context.fileSystem.changeDirectory('/manifests')
            const completions = getCompletions('nano ', context)
            expect(completions).toContain('pod.yaml')
            expect(completions).toContain('deployment.yaml')
        })

        it('vi and vim work for file completion', () => {
            context.fileSystem.changeDirectory('/manifests')

            const viCompletions = getCompletions('vi ', context)
            const vimCompletions = getCompletions('vim ', context)

            expect(viCompletions).toContain('pod.yaml')
            expect(vimCompletions).toContain('pod.yaml')
        })

        it('completes files after rm', () => {
            context.fileSystem.changeDirectory('/manifests')
            const completions = getCompletions('rm ', context)
            expect(completions).toContain('pod.yaml')
        })
    })

    describe('kubectl logs and exec completion', () => {
        it('completes pod names directly after kubectl logs', () => {
            const completions = getCompletions('kubectl logs ', context)
            expect(completions).toContain('nginx-1')
            expect(completions).toContain('nginx-2')
            expect(completions).toContain('redis-1')
        })

        it('completes pod names after kubectl logs with partial match', () => {
            const completions = getCompletions('kubectl logs ngin', context)
            expect(completions).toContain('nginx-1')
            expect(completions).toContain('nginx-2')
            expect(completions).not.toContain('redis-1')
        })

        it('completes pod names directly after kubectl exec', () => {
            const completions = getCompletions('kubectl exec ', context)
            expect(completions).toContain('nginx-1')
            expect(completions).toContain('nginx-2')
            expect(completions).toContain('redis-1')
        })

        it('completes pod names after kubectl exec with partial match', () => {
            const completions = getCompletions('kubectl exec red', context)
            expect(completions).toContain('redis-1')
            expect(completions).not.toContain('nginx-1')
        })
    })

    describe('Edge Cases', () => {
        it('handles multiple spaces', () => {
            const completions = getCompletions('kubectl  get  ', context)
            expect(completions).toContain('pods')
        })

        it('handles trailing spaces', () => {
            const completions = getCompletions('kubectl ', context)
            expect(completions.length).toBeGreaterThan(0)
        })

        it('returns empty array for complete unknown command', () => {
            const completions = getCompletions('unknown-command', context)
            expect(completions).toEqual([])
        })

        it('returns empty array for commands without file completion', () => {
            const completions = getCompletions('echo ', context)
            expect(completions).toEqual([])
        })
    })
})
