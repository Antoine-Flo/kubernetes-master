import { describe, it, expect } from 'vitest'
import { validateYaml } from '../../../src/editor/validation'

describe('validateYaml', () => {
    it('should validate correct YAML', () => {
        const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test
`
        const result = validateYaml(yaml)
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toBeDefined()
        }
    })

    it('should accept empty string', () => {
        const result = validateYaml('')
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toBeNull()
        }
    })

    it('should accept whitespace only', () => {
        const result = validateYaml('   \n  \t  ')
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toBeNull()
        }
    })

    it('should reject invalid YAML - bad indentation', () => {
        const yaml = `
apiVersion: v1
kind: Pod
  metadata:
    name: test
`
        const result = validateYaml(yaml)
        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.error).toContain('Nested mappings')
        }
    })

    it('should reject invalid YAML - unclosed bracket', () => {
        const yaml = 'test: [1, 2, 3'
        const result = validateYaml(yaml)
        expect(result.ok).toBe(false)
    })

    it('should parse nested structures', () => {
        const yaml = `
nested:
  level1:
    level2:
      value: test
`
        const result = validateYaml(yaml)
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toMatchObject({
                nested: {
                    level1: {
                        level2: {
                            value: 'test'
                        }
                    }
                }
            })
        }
    })

    it('should parse arrays', () => {
        const yaml = `
items:
  - name: item1
  - name: item2
`
        const result = validateYaml(yaml)
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toMatchObject({
                items: [
                    { name: 'item1' },
                    { name: 'item2' }
                ]
            })
        }
    })

    it('should handle single document YAML with separator', () => {
        const yaml = `---
apiVersion: v1
kind: Pod
metadata:
  name: test`
        const result = validateYaml(yaml)
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toBeDefined()
        }
    })
})

