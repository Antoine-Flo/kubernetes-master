import { describe, it, expect, beforeEach } from 'vitest'
import { getCompletions, getCommonPrefix, formatSuggestions, type AutocompleteContext } from '../../../src/terminal/autocomplete'
import { createClusterState } from '../../../src/cluster/ClusterState'
import { createFileSystem } from '../../../src/filesystem/FileSystem'
import { createPod } from '../../../src/cluster/models/Pod'

describe('Autocomplete', () => {
    let context: AutocompleteContext

    beforeEach(() => {
        const clusterState = createClusterState()

        // Add some test pods
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
            expect(completions).toContain('mkdir')
            expect(completions).toContain('touch')
            expect(completions).toContain('cat')
            expect(completions).toContain('nano')
            expect(completions).toContain('vi')
            expect(completions).toContain('vim')
            expect(completions).toContain('rm')
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
            expect(completions).toContain('create')
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
    })

    describe('Resource Type Completion', () => {
        it('completes resource types after kubectl get', () => {
            const completions = getCompletions('kubectl get ', context)
            expect(completions).toContain('pods')
            expect(completions).toContain('deployments')
            expect(completions).toContain('services')
            expect(completions).toContain('namespaces')
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

        it('completes deployments from kubectl get d', () => {
            const completions = getCompletions('kubectl get d', context)
            expect(completions).toContain('deployments')
            expect(completions).toContain('deployment')
            expect(completions).toContain('deploy')
        })

        it('completes services from kubectl get s', () => {
            const completions = getCompletions('kubectl get s', context)
            expect(completions).toContain('services')
            expect(completions).toContain('service')
            expect(completions).toContain('svc')
        })

        it('completes resource types after kubectl describe', () => {
            const completions = getCompletions('kubectl describe ', context)
            expect(completions).toContain('pods')
            expect(completions).toContain('deployments')
            expect(completions).toContain('services')
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
    })

    describe('File Path Completion', () => {
        it('completes directory names after cd', () => {
            const completions = getCompletions('cd ', context)
            expect(completions).toContain('manifests')
            expect(completions).toContain('examples')
        })

        it('cd only suggests directories, not files', () => {
            // In manifests: has pod.yaml file
            context.fileSystem.changeDirectory('/manifests')
            const completions = getCompletions('cd ', context)
            expect(completions).toEqual([])  // No subdirectories in manifests
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
            // First cd into manifests
            context.fileSystem.changeDirectory('/manifests')
            const completions = getCompletions('cat ', context)
            expect(completions).toContain('pod.yaml')
        })

        it('cat only suggests files, not directories', () => {
            // At root: has directories but no files
            const completions = getCompletions('cat ', context)
            expect(completions).toEqual([])  // No files at root
            expect(completions).not.toContain('manifests')
            expect(completions).not.toContain('examples')
        })

        it('completes paths after kubectl apply -f', () => {
            context.fileSystem.changeDirectory('/manifests')
            const completions = getCompletions('kubectl apply -f ', context)
            expect(completions).toContain('pod.yaml')
        })

        it('kubectl apply -f only suggests yaml files', () => {
            context.fileSystem.changeDirectory('/manifests')
            context.fileSystem.createFile('config.json')
            context.fileSystem.createFile('deployment.yaml')

            const completions = getCompletions('kubectl apply -f ', context)
            expect(completions).toContain('pod.yaml')
            expect(completions).toContain('deployment.yaml')
            expect(completions).not.toContain('config.json')  // JSON not suggested for kubectl
        })

        it('completes files after rm', () => {
            context.fileSystem.changeDirectory('/manifests')
            const completions = getCompletions('rm ', context)
            expect(completions).toContain('pod.yaml')
        })

        it('completes files after nano', () => {
            context.fileSystem.changeDirectory('/manifests')
            const completions = getCompletions('nano ', context)
            expect(completions).toContain('pod.yaml')
        })

        it('nano only suggests files, not directories', () => {
            // At root: has directories (manifests, examples) and no files
            const completions = getCompletions('nano ', context)
            expect(completions).toEqual([])  // No files at root
            expect(completions).not.toContain('manifests')
            expect(completions).not.toContain('examples')
        })

        it('nano only suggests files with valid extensions', () => {
            // Add a file with invalid extension
            context.fileSystem.changeDirectory('/manifests')
            context.fileSystem.createFile('script.sh')
            context.fileSystem.createFile('config.yaml')

            const completions = getCompletions('nano ', context)
            expect(completions).toContain('pod.yaml')
            expect(completions).toContain('config.yaml')
            expect(completions).not.toContain('script.sh')  // .sh not in allowed extensions
        })

        it('vi and vim work as aliases for nano', () => {
            context.fileSystem.changeDirectory('/manifests')

            const viCompletions = getCompletions('vi ', context)
            const vimCompletions = getCompletions('vim ', context)
            const nanoCompletions = getCompletions('nano ', context)

            // All should suggest the same files
            expect(viCompletions).toEqual(nanoCompletions)
            expect(vimCompletions).toEqual(nanoCompletions)
        })

        it('handles absolute paths', () => {
            const completions = getCompletions('cd /', context)
            expect(completions).toContain('/manifests')
            expect(completions).toContain('/examples')
        })
    })

    describe('Flag Completion', () => {
        it('completes kubectl flags starting with -', () => {
            const completions = getCompletions('kubectl get pods -', context)
            expect(completions).toContain('-n')
            expect(completions).toContain('-o')
            expect(completions).toContain('-l')
            expect(completions).toContain('-A')
        })

        it('completes kubectl flags starting with --', () => {
            const completions = getCompletions('kubectl get pods --', context)
            expect(completions).toContain('--namespace')
            expect(completions).toContain('--output')
            expect(completions).toContain('--selector')
            expect(completions).toContain('--all-namespaces')
        })

        it('completes namespace flag from --n', () => {
            const completions = getCompletions('kubectl get pods --n', context)
            expect(completions).toEqual(['--namespace'])
        })

        it('completes shell flags', () => {
            const completions = getCompletions('ls -', context)
            expect(completions).toContain('-l')
            expect(completions).toContain('-r')
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

        it('handles commands with flags already present', () => {
            const completions = getCompletions('kubectl get pods -n default ', context)
            expect(completions).toContain('nginx-1')
            expect(completions).toContain('nginx-2')
        })

        it('completes after partial flag value', () => {
            const completions = getCompletions('kubectl apply -f pod', context)
            // Should still try to complete the file path
            expect(Array.isArray(completions)).toBe(true)
        })
    })
})

