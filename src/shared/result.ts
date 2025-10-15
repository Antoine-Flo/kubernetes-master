// ═══════════════════════════════════════════════════════════════════════════
// SHARED RESULT TYPES & HELPERS
// ═══════════════════════════════════════════════════════════════════════════
// Centralized discriminated unions and helper functions for error handling.
// Follows functional programming principles with pure factory functions.
// 
// Philosophy: Unix-like - success = stdout, error = stderr

// ─── Core Result Types ───────────────────────────────────────────────────

/**
 * Generic Result type for operations that can succeed or fail
 * @template T - Success data type
 * @template E - Error message type (defaults to string)
 */
export type Result<T, E = string> =
    | { type: 'success'; data: T }
    | { type: 'error'; message: E }

/**
 * Result type for command execution (stdout/stderr)
 * Success = stdout, Error = stderr
 */
export type ExecutionResult = Result<string>

// ─── Factory Functions ───────────────────────────────────────────────────

/**
 * Create a success result
 * Pure function
 */
export const success = <T>(data: T): Result<T> => ({
    type: 'success',
    data
})

/**
 * Create an error result
 * Pure function
 */
export const error = (message: string): Result<never> => ({
    type: 'error',
    message
})

