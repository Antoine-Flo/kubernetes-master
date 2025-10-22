import { describe, expect, it } from 'vitest'
import { addPod, createEmptyState } from '../../../../../src/cluster/ClusterState'
import { createPod } from '../../../../../src/cluster/ressources/Pod'
import { handleExec } from '../../../../../src/kubectl/commands/handlers/exec'
import type { ParsedCommand } from '../../../../../src/kubectl/commands/types'

describe('handleExec', () => {
    describe('basic functionality', () => {
        it('should execute command in running pod', () => {
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'nginx',
                namespace: 'default',
                flags: { it: true },
                execCommand: ['ls', '/app'],
            }

            const result = handleExec(state, parsed)
            expect(result).toContain('/app')
        })

        it('should return error if pod not found', () => {
            const state = createEmptyState()

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'nonexistent',
                namespace: 'default',
                flags: { it: true },
                execCommand: ['sh'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('Error from server (NotFound): pods "nonexistent" not found')
        })

        it('should return error if pod is not Running', () => {
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
                phase: 'Pending',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'nginx',
                flags: { it: true },
                execCommand: ['sh'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('Error: pod "nginx" is not running (current phase: Pending)')
        })

        it('should return error if pod name not provided', () => {
            const state = createEmptyState()

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                flags: { it: true },
                execCommand: ['sh'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('Error: pod name is required')
        })

        it('should return error if no command provided', () => {
            const pod = createPod({
                name: 'nginx',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:latest' }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'nginx',
                flags: { it: true },
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('Error: command must be specified after --')
        })
    })

    describe('shell commands', () => {
        it('should handle sh command', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['sh'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('ENTER_CONTAINER:app:app:default')
        })

        it('should handle bash command', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['bash'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('ENTER_CONTAINER:app:app:default')
        })

        it('should handle /bin/sh command', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['/bin/sh'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('ENTER_CONTAINER:app:app:default')
        })
    })

    describe('environment variables', () => {
        it('should display env vars with env command', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{
                    name: 'app',
                    image: 'myapp:1.0',
                    env: [
                        { name: 'DB_HOST', source: { type: 'value', value: 'localhost' } },
                        { name: 'DB_PORT', source: { type: 'value', value: '5432' } },
                    ],
                }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['env'],
            }

            const result = handleExec(state, parsed)
            expect(result).toContain('DB_HOST=localhost')
            expect(result).toContain('DB_PORT=5432')
        })

        it('should show ConfigMap env vars', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{
                    name: 'app',
                    image: 'myapp:1.0',
                    env: [
                        {
                            name: 'CONFIG_VALUE',
                            source: { type: 'configMapKeyRef', name: 'my-config', key: 'key1' },
                        },
                    ],
                }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['env'],
            }

            const result = handleExec(state, parsed)
            expect(result).toContain('CONFIG_VALUE=<from configMap my-config:key1>')
        })

        it('should show Secret env vars', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{
                    name: 'app',
                    image: 'myapp:1.0',
                    env: [
                        {
                            name: 'PASSWORD',
                            source: { type: 'secretKeyRef', name: 'my-secret', key: 'password' },
                        },
                    ],
                }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['env'],
            }

            const result = handleExec(state, parsed)
            expect(result).toContain('PASSWORD=<from secret my-secret:password>')
        })

        it('should include standard env vars with env command', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['env'],
            }

            const result = handleExec(state, parsed)
            expect(result).toContain('PATH=')
            expect(result).toContain('HOME=')
        })
    })

    describe('filesystem commands', () => {
        it('should simulate ls command', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['ls'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('SHELL_COMMAND:ls')
        })

        it('should simulate ls with path argument', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['ls', '/app'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('SHELL_COMMAND:ls /app')
        })

        it('should simulate pwd command', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['pwd'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('SHELL_COMMAND:pwd')
        })

        it('should simulate whoami command', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['whoami'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('SHELL_COMMAND:whoami')
        })
    })

    describe('namespace handling', () => {
        it('should find pod in specified namespace', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'production',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                namespace: 'production',
                flags: { it: true, n: 'production' },
                execCommand: ['pwd'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('SHELL_COMMAND:pwd')
        })

        it('should default to "default" namespace', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['pwd'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('SHELL_COMMAND:pwd')
        })
    })

    describe('generic commands', () => {
        it('should simulate generic command execution', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['curl', 'http://api'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('SHELL_COMMAND:curl http://api')
        })

        it('should handle complex command with multiple arguments', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                phase: 'Running',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['echo', 'Hello', 'World'],
            }

            const result = handleExec(state, parsed)
            expect(result).toContain('echo Hello World')
        })
    })

    describe('different pod phases', () => {
        it('should reject Failed pods', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                phase: 'Failed',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['sh'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('Error: pod "app" is not running (current phase: Failed)')
        })

        it('should reject Succeeded pods', () => {
            const pod = createPod({
                name: 'app',
                namespace: 'default',
                containers: [{ name: 'app', image: 'myapp:1.0' }],
                phase: 'Succeeded',
            })

            const state = addPod(createEmptyState(), pod)

            const parsed: ParsedCommand = {
                action: 'exec',
                resource: 'pods',
                name: 'app',
                flags: { it: true },
                execCommand: ['sh'],
            }

            const result = handleExec(state, parsed)
            expect(result).toBe('Error: pod "app" is not running (current phase: Succeeded)')
        })
    })
})

