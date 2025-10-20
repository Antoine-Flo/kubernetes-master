import { parse } from 'yaml'
import type { Result } from '../shared/result'
import { error, success } from '../shared/result'

// ═══════════════════════════════════════════════════════════════════════════
// YAML VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
// Validates YAML content using the yaml parser.
// Returns Result with parsed object or error message.

/**
 * Validate YAML content
 * @param content - YAML string to validate
 * @returns Result with parsed object or error message
 */
export const validateYaml = (content: string): Result<unknown> => {
    if (!content.trim()) {
        return success(null)
    }

    try {
        const parsed = parse(content)
        return success(parsed)
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Invalid YAML'
        return error(message)
    }
}

