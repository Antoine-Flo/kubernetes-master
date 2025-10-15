import { describe, it, expect } from 'vitest'
import {
    trim,
    tokenize,
    parseFlagsRaw,
    normalizeFlags,
    parseSelector,
    pipeResult,
    extractArgsRaw,
} from '../../../src/shared/parsing'

// ═══════════════════════════════════════════════════════════════════════════
// SHARED PARSING UTILITIES TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('trim (pipeline step)', () => {
    it('should trim input and return success', () => {
        const result = trim({ input: '  kubectl get pods  ' })
        expect(result.type).toBe('success')
        if (result.type === 'success') {
            expect(result.data.input).toBe('kubectl get pods')
        }
    })

    it('should return error for empty input', () => {
        const result = trim({ input: '' })
        expect(result.type).toBe('error')
        if (result.type === 'error') {
            expect(result.message).toBe('Command cannot be empty')
        }
    })

    it('should return error for whitespace-only input', () => {
        const result = trim({ input: '   ' })
        expect(result.type).toBe('error')
    })
})

describe('tokenize (pipeline step)', () => {
    it('should tokenize input and return success', () => {
        const result = tokenize({ input: 'kubectl get pods' })
        expect(result.type).toBe('success')
        if (result.type === 'success') {
            expect(result.data.tokens).toEqual(['kubectl', 'get', 'pods'])
        }
    })

    it('should handle multiple spaces', () => {
        const result = tokenize({ input: 'kubectl  get   pods' })
        expect(result.type).toBe('success')
        if (result.type === 'success') {
            expect(result.data.tokens).toEqual(['kubectl', 'get', 'pods'])
        }
    })

    it('should handle leading and trailing whitespace', () => {
        const result = tokenize({ input: '  kubectl get pods  ' })
        expect(result.type).toBe('success')
        if (result.type === 'success') {
            expect(result.data.tokens).toEqual(['kubectl', 'get', 'pods'])
        }
    })

    it('should handle tabs', () => {
        const result = tokenize({ input: 'kubectl\tget\tpods' })
        expect(result.type).toBe('success')
        if (result.type === 'success') {
            expect(result.data.tokens).toEqual(['kubectl', 'get', 'pods'])
        }
    })

    it('should return error for empty input', () => {
        const result = tokenize({ input: '' })
        expect(result.type).toBe('error')
        if (result.type === 'error') {
            expect(result.message).toBe('Command cannot be empty')
        }
    })

    it('should return error for whitespace-only input', () => {
        const result = tokenize({ input: '   ' })
        expect(result.type).toBe('error')
    })
})

describe('parseFlagsRaw (low-level helper)', () => {
    it('should parse value flags', () => {
        const result = parseFlagsRaw(['-n', 'default', '--output', 'yaml'])
        expect(result).toEqual({
            n: 'default',
            output: 'yaml',
        })
    })

    it('should parse boolean flags', () => {
        const result = parseFlagsRaw(['-A', '--watch'])
        expect(result).toEqual({
            A: true,
            watch: true,
        })
    })

    it('should parse mixed value and boolean flags', () => {
        const result = parseFlagsRaw(['-n', 'default', '-A', '--output', 'yaml'])
        expect(result).toEqual({
            n: 'default',
            A: true,
            output: 'yaml',
        })
    })

    it('should handle flags with double dashes', () => {
        const result = parseFlagsRaw(['--namespace', 'kube-system'])
        expect(result).toEqual({
            namespace: 'kube-system',
        })
    })

    it('should handle flags at the end (boolean)', () => {
        const result = parseFlagsRaw(['pods', '-A'])
        expect(result).toEqual({
            A: true,
        })
    })

    it('should respect startIndex parameter', () => {
        const result = parseFlagsRaw(['kubectl', 'get', '-n', 'default'], 2)
        expect(result).toEqual({
            n: 'default',
        })
    })

    it('should return empty object when no flags', () => {
        const result = parseFlagsRaw(['kubectl', 'get', 'pods'])
        expect(result).toEqual({})
    })

    it('should handle consecutive flags correctly', () => {
        const result = parseFlagsRaw(['-n', 'default', '-l', 'app=nginx'])
        expect(result).toEqual({
            n: 'default',
            l: 'app=nginx',
        })
    })
})

describe('normalizeFlags', () => {
    it('should normalize short flag names to long names', () => {
        const flags = { n: 'default', o: 'yaml' }
        const aliases = { n: 'namespace', o: 'output' }
        const result = normalizeFlags(flags, aliases)

        expect(result).toEqual({
            namespace: 'default',
            output: 'yaml',
        })
    })

    it('should keep long names unchanged', () => {
        const flags = { namespace: 'default', output: 'yaml' }
        const aliases = { n: 'namespace', o: 'output' }
        const result = normalizeFlags(flags, aliases)

        expect(result).toEqual({
            namespace: 'default',
            output: 'yaml',
        })
    })

    it('should keep unknown flags unchanged', () => {
        const flags = { n: 'default', custom: 'value' }
        const aliases = { n: 'namespace' }
        const result = normalizeFlags(flags, aliases)

        expect(result).toEqual({
            namespace: 'default',
            custom: 'value',
        })
    })

    it('should handle boolean flags', () => {
        const flags = { A: true, watch: false }
        const aliases = { A: 'all-namespaces' }
        const result = normalizeFlags(flags, aliases)

        expect(result).toEqual({
            'all-namespaces': true,
            watch: false,
        })
    })

    it('should return empty object for empty flags', () => {
        const result = normalizeFlags({}, {})
        expect(result).toEqual({})
    })
})

describe('parseSelector', () => {
    it('should parse single label selector', () => {
        const result = parseSelector('app=nginx')
        expect(result).toEqual({
            app: 'nginx',
        })
    })

    it('should parse multiple label selectors', () => {
        const result = parseSelector('app=nginx,env=prod')
        expect(result).toEqual({
            app: 'nginx',
            env: 'prod',
        })
    })

    it('should parse complex selectors', () => {
        const result = parseSelector('app=nginx,env=prod,tier=backend')
        expect(result).toEqual({
            app: 'nginx',
            env: 'prod',
            tier: 'backend',
        })
    })

    it('should handle spaces around separators', () => {
        const result = parseSelector('app = nginx , env = prod')
        expect(result).toEqual({
            app: 'nginx',
            env: 'prod',
        })
    })

    it('should ignore malformed pairs', () => {
        const result = parseSelector('app=nginx,invalid,env=prod')
        expect(result).toEqual({
            app: 'nginx',
            env: 'prod',
        })
    })

    it('should ignore pairs without value', () => {
        const result = parseSelector('app=,env=prod')
        expect(result).toEqual({
            env: 'prod',
        })
    })

    it('should ignore pairs without key', () => {
        const result = parseSelector('=nginx,env=prod')
        expect(result).toEqual({
            env: 'prod',
        })
    })

    it('should return empty object for empty selector', () => {
        const result = parseSelector('')
        expect(result).toEqual({})
    })
})

describe('pipeResult', () => {
    // Helper types for testing
    type Result<T> = { type: 'success'; data: T } | { type: 'error'; message: string }
    const ok = <T>(data: T): Result<T> => ({ type: 'success', data })
    const err = (message: string): Result<never> => ({ type: 'error', message })

    it('should compose successful Result transformations', () => {
        const addOne = (x: number): Result<number> => ok(x + 1)
        const double = (x: number): Result<number> => ok(x * 2)
        const subtract3 = (x: number): Result<number> => ok(x - 3)

        const composed = pipeResult(addOne, double, subtract3)
        const result = composed(5)

        // (5 + 1) * 2 - 3 = 12 - 3 = 9
        expect(result.type).toBe('success')
        if (result.type === 'success') {
            expect(result.data).toBe(9)
        }
    })

    it('should stop at first error (Railway pattern)', () => {
        const addOne = (x: number): Result<number> => ok(x + 1)
        const failIfEven = (x: number): Result<number> =>
            x % 2 === 0 ? err('number is even') : ok(x)
        const double = (x: number): Result<number> => ok(x * 2)

        const composed = pipeResult(addOne, failIfEven, double)
        const result = composed(5)

        // 5 + 1 = 6 (even), should fail here, double never runs
        expect(result.type).toBe('error')
        if (result.type === 'error') {
            expect(result.message).toBe('number is even')
        }
    })

    it('should propagate first error in pipeline', () => {
        const step1 = (x: number): Result<number> => ok(x + 1)
        const step2 = (_x: number): Result<number> => err('step 2 failed')
        const step3 = (x: number): Result<number> => ok(x * 2)
        const step4 = (_x: number): Result<number> => err('step 4 failed')

        const composed = pipeResult(step1, step2, step3, step4)
        const result = composed(5)

        // Should stop at step2, never reach step3 or step4
        expect(result.type).toBe('error')
        if (result.type === 'error') {
            expect(result.message).toBe('step 2 failed')
        }
    })

    it('should work with single function', () => {
        const addOne = (x: number): Result<number> => ok(x + 1)
        const composed = pipeResult(addOne)
        const result = composed(5)

        expect(result.type).toBe('success')
        if (result.type === 'success') {
            expect(result.data).toBe(6)
        }
    })

    it('should work with no functions (identity)', () => {
        const composed = pipeResult<number>()
        const result = composed(5)

        expect(result.type).toBe('success')
        if (result.type === 'success') {
            expect(result.data).toBe(5)
        }
    })

    it('should handle validation pipeline', () => {
        type User = { name: string; age: number }

        const validateName = (user: User): Result<User> =>
            user.name.length > 0 ? ok(user) : err('name is required')

        const validateAge = (user: User): Result<User> =>
            user.age >= 18 ? ok(user) : err('must be 18 or older')

        const normalize = (user: User): Result<User> =>
            ok({ ...user, name: user.name.trim().toUpperCase() })

        const pipeline = pipeResult(validateName, validateAge, normalize)

        // Valid user
        const validResult = pipeline({ name: 'Alice', age: 25 })
        expect(validResult.type).toBe('success')
        if (validResult.type === 'success') {
            expect(validResult.data.name).toBe('ALICE')
        }

        // Invalid name
        const invalidName = pipeline({ name: '', age: 25 })
        expect(invalidName.type).toBe('error')
        if (invalidName.type === 'error') {
            expect(invalidName.message).toBe('name is required')
        }

        // Invalid age
        const invalidAge = pipeline({ name: 'Bob', age: 16 })
        expect(invalidAge.type).toBe('error')
        if (invalidAge.type === 'error') {
            expect(invalidAge.message).toBe('must be 18 or older')
        }
    })
})

describe('extractArgsRaw (low-level helper)', () => {
    it('should extract non-flag arguments', () => {
        const result = extractArgsRaw(['get', 'pods', 'nginx', '-n', 'default'])
        expect(result).toEqual(['get', 'pods', 'nginx'])
    })

    it('should skip flags and their values', () => {
        const result = extractArgsRaw(['get', 'pods', '-n', 'default', '--output', 'yaml'])
        expect(result).toEqual(['get', 'pods'])
    })

    it('should handle boolean flags correctly', () => {
        const result = extractArgsRaw(['get', 'pods', '-A'])
        expect(result).toEqual(['get', 'pods'])
    })

    it('should respect startIndex parameter', () => {
        const result = extractArgsRaw(['kubectl', 'get', 'pods', '-n', 'default'], 1)
        expect(result).toEqual(['get', 'pods'])
    })

    it('should return empty array when only flags', () => {
        const result = extractArgsRaw(['-n', 'default', '-A'])
        expect(result).toEqual([])
    })

    it('should handle mixed args and flags', () => {
        const result = extractArgsRaw(['cmd', 'arg1', '-f', 'value', 'arg2', '--flag'])
        expect(result).toEqual(['cmd', 'arg1', 'arg2'])
    })

    it('should return all args when no flags', () => {
        const result = extractArgsRaw(['one', 'two', 'three'])
        expect(result).toEqual(['one', 'two', 'three'])
    })
})

