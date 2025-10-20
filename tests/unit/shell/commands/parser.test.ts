import { describe, it, expect } from 'vitest'
import { parseShellCommand } from '../../../../src/shell/commands/parser'
import type { ParsedShellCommand } from '../../../../src/shell/commands/types'

describe('Shell Parser', () => {
    describe('parseShellCommand', () => {
        describe('basic commands without arguments', () => {
            it('should parse "pwd"', () => {
                const result = parseShellCommand('pwd')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('pwd')
                    expect(result.value.args).toEqual([])
                    expect(result.value.flags).toEqual({})
                }
            })

            it('should parse "clear"', () => {
                const result = parseShellCommand('clear')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('clear')
                    expect(result.value.args).toEqual([])
                    expect(result.value.flags).toEqual({})
                }
            })

            it('should parse "help"', () => {
                const result = parseShellCommand('help')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('help')
                    expect(result.value.args).toEqual([])
                    expect(result.value.flags).toEqual({})
                }
            })

            it('should parse "ls"', () => {
                const result = parseShellCommand('ls')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('ls')
                    expect(result.value.args).toEqual([])
                    expect(result.value.flags).toEqual({})
                }
            })
        })

        describe('commands with single argument', () => {
            it('should parse "cd /manifests"', () => {
                const result = parseShellCommand('cd /manifests')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('cd')
                    expect(result.value.args).toEqual(['/manifests'])
                    expect(result.value.flags).toEqual({})
                }
            })

            it('should parse "cd .."', () => {
                const result = parseShellCommand('cd ..')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('cd')
                    expect(result.value.args).toEqual(['..'])
                }
            })

            it('should parse "mkdir dev"', () => {
                const result = parseShellCommand('mkdir dev')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('mkdir')
                    expect(result.value.args).toEqual(['dev'])
                    expect(result.value.flags).toEqual({})
                }
            })

            it('should parse "touch nginx.yaml"', () => {
                const result = parseShellCommand('touch nginx.yaml')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('touch')
                    expect(result.value.args).toEqual(['nginx.yaml'])
                    expect(result.value.flags).toEqual({})
                }
            })

            it('should parse "cat pod.yaml"', () => {
                const result = parseShellCommand('cat pod.yaml')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('cat')
                    expect(result.value.args).toEqual(['pod.yaml'])
                    expect(result.value.flags).toEqual({})
                }
            })

            it('should parse "rm nginx.yaml"', () => {
                const result = parseShellCommand('rm nginx.yaml')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('rm')
                    expect(result.value.args).toEqual(['nginx.yaml'])
                    expect(result.value.flags).toEqual({})
                }
            })
        })

        describe('commands with flags', () => {
            it('should parse "ls -l"', () => {
                const result = parseShellCommand('ls -l')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('ls')
                    expect(result.value.args).toEqual([])
                    expect(result.value.flags).toEqual({ l: true })
                }
            })

            it('should parse "mkdir -p dev/test"', () => {
                const result = parseShellCommand('mkdir -p dev/test')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('mkdir')
                    expect(result.value.args).toEqual([])
                    expect(result.value.flags).toEqual({ p: 'dev/test' })
                }
            })

            it('should parse "rm -r mydir"', () => {
                const result = parseShellCommand('rm -r mydir')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('rm')
                    expect(result.value.args).toEqual([])
                    expect(result.value.flags).toEqual({ r: 'mydir' })
                }
            })

            it('should parse "ls -l /manifests"', () => {
                const result = parseShellCommand('ls -l /manifests')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('ls')
                    expect(result.value.args).toEqual([])
                    expect(result.value.flags).toEqual({ l: '/manifests' })
                }
            })
        })

        describe('commands with paths', () => {
            it('should parse "cd /examples"', () => {
                const result = parseShellCommand('cd /examples')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('cd')
                    expect(result.value.args).toEqual(['/examples'])
                }
            })

            it('should parse "ls /manifests/dev"', () => {
                const result = parseShellCommand('ls /manifests/dev')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('ls')
                    expect(result.value.args).toEqual(['/manifests/dev'])
                }
            })

            it('should parse "cat /examples/pod.yaml"', () => {
                const result = parseShellCommand('cat /examples/pod.yaml')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('cat')
                    expect(result.value.args).toEqual(['/examples/pod.yaml'])
                }
            })
        })

        describe('edge cases and errors', () => {
            it('should return error for empty input', () => {
                const result = parseShellCommand('')

                expect(result.ok).toBe(false)
                if (!result.ok) {
                    expect(result.error).toContain('empty')
                }
            })

            it('should return error for whitespace only', () => {
                const result = parseShellCommand('   ')

                expect(result.ok).toBe(false)
                if (!result.ok) {
                    expect(result.error).toContain('empty')
                }
            })

            it('should return error for unknown command', () => {
                const result = parseShellCommand('unknown')

                expect(result.ok).toBe(false)
                if (!result.ok) {
                    expect(result.error).toContain('Unknown command')
                    expect(result.error).toContain('unknown')
                }
            })

            it('should return error for kubectl command', () => {
                const result = parseShellCommand('kubectl get pods')

                expect(result.ok).toBe(false)
                if (!result.ok) {
                    expect(result.error).toContain('Unknown command')
                }
            })
        })

        describe('whitespace handling', () => {
            it('should handle extra spaces between tokens', () => {
                const result = parseShellCommand('cd    /manifests')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('cd')
                    expect(result.value.args).toEqual(['/manifests'])
                }
            })

            it('should trim leading and trailing whitespace', () => {
                const result = parseShellCommand('  ls -l  ')

                expect(result.ok).toBe(true)
                if (result.ok) {
                    expect(result.value.command).toBe('ls')
                    expect(result.value.flags).toEqual({ l: true })
                }
            })
        })
    })
})

