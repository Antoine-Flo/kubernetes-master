import { describe, it, expect } from 'vitest'
import { parseShellCommand } from '../../../../src/shell/commands/parser'
import type { ParsedShellCommand } from '../../../../src/shell/commands/types'

describe('Shell Parser', () => {
    describe('parseShellCommand', () => {
        describe('basic commands without arguments', () => {
            it('should parse "pwd"', () => {
                const result = parseShellCommand('pwd')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('pwd')
                    expect(result.data.args).toEqual([])
                    expect(result.data.flags).toEqual({})
                }
            })

            it('should parse "clear"', () => {
                const result = parseShellCommand('clear')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('clear')
                    expect(result.data.args).toEqual([])
                    expect(result.data.flags).toEqual({})
                }
            })

            it('should parse "help"', () => {
                const result = parseShellCommand('help')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('help')
                    expect(result.data.args).toEqual([])
                    expect(result.data.flags).toEqual({})
                }
            })

            it('should parse "ls"', () => {
                const result = parseShellCommand('ls')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('ls')
                    expect(result.data.args).toEqual([])
                    expect(result.data.flags).toEqual({})
                }
            })
        })

        describe('commands with single argument', () => {
            it('should parse "cd /manifests"', () => {
                const result = parseShellCommand('cd /manifests')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('cd')
                    expect(result.data.args).toEqual(['/manifests'])
                    expect(result.data.flags).toEqual({})
                }
            })

            it('should parse "cd .."', () => {
                const result = parseShellCommand('cd ..')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('cd')
                    expect(result.data.args).toEqual(['..'])
                }
            })

            it('should parse "mkdir dev"', () => {
                const result = parseShellCommand('mkdir dev')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('mkdir')
                    expect(result.data.args).toEqual(['dev'])
                    expect(result.data.flags).toEqual({})
                }
            })

            it('should parse "touch nginx.yaml"', () => {
                const result = parseShellCommand('touch nginx.yaml')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('touch')
                    expect(result.data.args).toEqual(['nginx.yaml'])
                    expect(result.data.flags).toEqual({})
                }
            })

            it('should parse "cat pod.yaml"', () => {
                const result = parseShellCommand('cat pod.yaml')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('cat')
                    expect(result.data.args).toEqual(['pod.yaml'])
                    expect(result.data.flags).toEqual({})
                }
            })

            it('should parse "rm nginx.yaml"', () => {
                const result = parseShellCommand('rm nginx.yaml')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('rm')
                    expect(result.data.args).toEqual(['nginx.yaml'])
                    expect(result.data.flags).toEqual({})
                }
            })
        })

        describe('commands with flags', () => {
            it('should parse "ls -l"', () => {
                const result = parseShellCommand('ls -l')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('ls')
                    expect(result.data.args).toEqual([])
                    expect(result.data.flags).toEqual({ l: true })
                }
            })

            it('should parse "mkdir -p dev/test"', () => {
                const result = parseShellCommand('mkdir -p dev/test')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('mkdir')
                    expect(result.data.args).toEqual([])
                    expect(result.data.flags).toEqual({ p: 'dev/test' })
                }
            })

            it('should parse "rm -r mydir"', () => {
                const result = parseShellCommand('rm -r mydir')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('rm')
                    expect(result.data.args).toEqual([])
                    expect(result.data.flags).toEqual({ r: 'mydir' })
                }
            })

            it('should parse "ls -l /manifests"', () => {
                const result = parseShellCommand('ls -l /manifests')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('ls')
                    expect(result.data.args).toEqual([])
                    expect(result.data.flags).toEqual({ l: '/manifests' })
                }
            })
        })

        describe('commands with paths', () => {
            it('should parse "cd /examples"', () => {
                const result = parseShellCommand('cd /examples')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('cd')
                    expect(result.data.args).toEqual(['/examples'])
                }
            })

            it('should parse "ls /manifests/dev"', () => {
                const result = parseShellCommand('ls /manifests/dev')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('ls')
                    expect(result.data.args).toEqual(['/manifests/dev'])
                }
            })

            it('should parse "cat /examples/pod.yaml"', () => {
                const result = parseShellCommand('cat /examples/pod.yaml')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('cat')
                    expect(result.data.args).toEqual(['/examples/pod.yaml'])
                }
            })
        })

        describe('edge cases and errors', () => {
            it('should return error for empty input', () => {
                const result = parseShellCommand('')

                expect(result.type).toBe('error')
                if (result.type === 'error') {
                    expect(result.message).toContain('empty')
                }
            })

            it('should return error for whitespace only', () => {
                const result = parseShellCommand('   ')

                expect(result.type).toBe('error')
                if (result.type === 'error') {
                    expect(result.message).toContain('empty')
                }
            })

            it('should return error for unknown command', () => {
                const result = parseShellCommand('unknown')

                expect(result.type).toBe('error')
                if (result.type === 'error') {
                    expect(result.message).toContain('Unknown command')
                    expect(result.message).toContain('unknown')
                }
            })

            it('should return error for kubectl command', () => {
                const result = parseShellCommand('kubectl get pods')

                expect(result.type).toBe('error')
                if (result.type === 'error') {
                    expect(result.message).toContain('Unknown command')
                }
            })
        })

        describe('whitespace handling', () => {
            it('should handle extra spaces between tokens', () => {
                const result = parseShellCommand('cd    /manifests')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('cd')
                    expect(result.data.args).toEqual(['/manifests'])
                }
            })

            it('should trim leading and trailing whitespace', () => {
                const result = parseShellCommand('  ls -l  ')

                expect(result.type).toBe('success')
                if (result.type === 'success') {
                    expect(result.data.command).toBe('ls')
                    expect(result.data.flags).toEqual({ l: true })
                }
            })
        })
    })
})

