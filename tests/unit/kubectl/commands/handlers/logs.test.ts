import { describe, it, expect } from 'vitest'
import { handleLogs } from '../../../../../src/kubectl/commands/handlers/logs'
import { createEmptyState, addPod } from '../../../../../src/cluster/ClusterState'
import { createPod } from '../../../../../src/cluster/ressources/Pod'
import type { ParsedCommand } from '../../../../../src/kubectl/commands/types'

describe('handleLogs', () => {
    describe('basic functionality', () => {
        it('should return logs from a pod', () => {
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
                logs: ['Log line 1', 'Log line 2', 'Log line 3'],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'nginx',
                namespace: 'default',
                flags: {},
            }

            const result = handleLogs(state, parsed)
            expect(result).toBe('Log line 1\nLog line 2\nLog line 3')
        })

        it('should generate logs if pod has no logs stored', () => {
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'nginx',
                namespace: 'default',
                flags: {},
            }

            const result = handleLogs(state, parsed)

            // Should generate logs (not empty)
            expect(result.length).toBeGreaterThan(0)
            expect(result).toContain('INFO')
        })

        it('should return error if pod not found', () => {
            const state = createEmptyState()

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'nonexistent',
                namespace: 'default',
                flags: {},
            }

            const result = handleLogs(state, parsed)
            expect(result).toBe('Error from server (NotFound): pods "nonexistent" not found')
        })

        it('should handle pod name in parsed command', () => {
            const pod = createPod({
                name: 'redis-pod',
                namespace: 'default',
                containers: [{ name: 'redis', image: 'redis:6' }],
                logs: ['Redis log 1'],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'redis-pod',
                flags: {},
            }

            const result = handleLogs(state, parsed)
            expect(result).toBe('Redis log 1')
        })
    })

    describe('namespace flag', () => {
        it('should find pod in specified namespace', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'production',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                logs: ['Production log'],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'app',
                namespace: 'production',
                flags: { n: 'production' },
            }

            const result = handleLogs(state, parsed)
            expect(result).toBe('Production log')
        })

        it('should return error if pod not in namespace', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                logs: ['Default log'],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'app',
                namespace: 'production',
                flags: { n: 'production' },
            }

            const result = handleLogs(state, parsed)
            expect(result).toBe('Error from server (NotFound): pods "app" not found')
        })

        it('should default to "default" namespace if not specified', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                logs: ['Default log'],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'app',
                flags: {},
            }

            const result = handleLogs(state, parsed)
            expect(result).toBe('Default log')
        })
    })

    describe('--tail flag', () => {
        it('should return last N lines with --tail', () => {
            const logs = Array.from({ length: 20 }, (_, i) => `Log line ${i + 1}`)
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                logs,
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'app',
                flags: { tail: '5' },
            }

            const result = handleLogs(state, parsed)
            expect(result).toBe('Log line 16\nLog line 17\nLog line 18\nLog line 19\nLog line 20')
        })

        it('should handle --tail with value larger than log count', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                logs: ['Log 1', 'Log 2', 'Log 3'],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'app',
                flags: { tail: '100' },
            }

            const result = handleLogs(state, parsed)
            expect(result).toBe('Log 1\nLog 2\nLog 3')
        })

        it('should return error for invalid --tail value', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                logs: ['Log 1'],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'app',
                flags: { tail: 'invalid' },
            }

            const result = handleLogs(state, parsed)
            expect(result).toBe('Error: --tail value must be a positive number')
        })

        it('should return error for negative --tail value', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                logs: ['Log 1'],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'app',
                flags: { tail: '-5' },
            }

            const result = handleLogs(state, parsed)
            expect(result).toBe('Error: --tail value must be a positive number')
        })

        it('should handle --tail=0 by returning empty string', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                logs: ['Log 1', 'Log 2'],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'app',
                flags: { tail: '0' },
            }

            const result = handleLogs(state, parsed)
            expect(result).toBe('')
        })
    })

    describe('--follow flag', () => {
        it('should add follow message with -f flag', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                logs: ['Log 1', 'Log 2'],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'app',
                flags: { f: true },
            }

            const result = handleLogs(state, parsed)
            expect(result).toContain('Log 1')
            expect(result).toContain('Log 2')
            expect(result).toContain('(following logs - press Ctrl+C to stop)')
        })

        it('should work with --follow long flag', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                logs: ['Log 1'],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'app',
                flags: { follow: true },
            }

            const result = handleLogs(state, parsed)
            expect(result).toContain('(following logs - press Ctrl+C to stop)')
        })

        it('should combine --tail and --follow flags', () => {
            const logs = Array.from({ length: 10 }, (_, i) => `Log ${i + 1}`)
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                logs,
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'app',
                flags: { tail: '3', f: true },
            }

            const result = handleLogs(state, parsed)
            expect(result).toContain('Log 8')
            expect(result).toContain('Log 9')
            expect(result).toContain('Log 10')
            expect(result).toContain('(following logs - press Ctrl+C to stop)')
            expect(result).not.toContain('Log 1\n')
            expect(result).not.toContain('Log 2')
        })
    })

    describe('empty logs', () => {
        it('should generate default logs for pod with empty log array', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                logs: [],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'app',
                flags: {},
            }

            const result = handleLogs(state, parsed)
            expect(result.length).toBeGreaterThan(0)
        })
    })

    describe('missing pod name', () => {
        it('should return error if pod name not provided', () => {
            const state = createEmptyState()

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                flags: {},
            }

            const result = handleLogs(state, parsed)
            expect(result).toBe('Error: pod name is required')
        })
    })

    describe('log generation based on image type', () => {
        it('should generate nginx-style logs for nginx image', () => {
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'nginx',
                flags: {},
            }

            const result = handleLogs(state, parsed)
            expect(result).toMatch(/GET|POST|PUT/)
        })

        it('should generate redis-style logs for redis image', () => {
            const pod = createPod({
                name: 'redis',
                namespace: 'default',
                containers: [{ name: 'redis', image: 'redis:6' }],
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'logs',
                resource: 'pods',
                name: 'redis',
                flags: {},
            }

            const result = handleLogs(state, parsed)
            expect(result.toLowerCase()).toMatch(/redis|connection|client/)
        })
    })
})

