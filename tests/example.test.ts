import { describe, it, expect } from 'vitest'

describe('Setup validation', () => {
    it('should pass basic assertion', () => {
        expect(1 + 1).toBe(2)
    })

    it('should handle strings', () => {
        expect('kubectl').toContain('kube')
    })
})

