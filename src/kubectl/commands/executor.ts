import type { ClusterState } from '../../cluster/ClusterState'
import { parseCommand } from './parser'
import type { ParsedCommand } from './types'
import { handleGet } from './handlers/get'
import { handleDescribe } from './handlers/describe'
import { handleDelete } from './handlers/delete'
import { handleApply } from './handlers/apply'
import { handleCreate } from './handlers/create'

// Execution result type using discriminated unions
export type ExecutionResult =
    | { type: 'success'; output: string }
    | { type: 'error'; message: string }

/**
 * Kubectl executor interface
 */
export interface KubectlExecutor {
    execute: (input: string) => ExecutionResult
}

/**
 * Create a kubectl executor
 * Factory function that encapsulates ClusterState in a closure
 * 
 * @param clusterState - The cluster state to operate on
 * @returns Executor with execute method
 */
export const createKubectlExecutor = (clusterState: ClusterState): KubectlExecutor => {
    const execute = (input: string): ExecutionResult => {
        // Parse the command
        const parseResult = parseCommand(input)

        // Handle parser errors
        if (parseResult.type === 'error') {
            return {
                type: 'error',
                message: parseResult.message
            }
        }

        const parsed = parseResult.data

        // Route to appropriate handler based on action
        return routeCommand(clusterState, parsed)
    }

    return { execute }
}

/**
 * Route parsed command to appropriate handler
 * Pure function that determines which handler to call
 */
const routeCommand = (clusterState: ClusterState, parsed: ParsedCommand): ExecutionResult => {
    const action = parsed.action

    if (action === 'get') {
        const output = handleGet(clusterState.toJSON(), parsed)
        return { type: 'success', output }
    }

    if (action === 'describe') {
        return handleDescribe(clusterState.toJSON(), parsed)
    }

    if (action === 'delete') {
        return handleDelete(clusterState, parsed)
    }

    if (action === 'apply') {
        const output = handleApply(parsed)
        return { type: 'success', output }
    }

    if (action === 'create') {
        const output = handleCreate(parsed)
        return { type: 'success', output }
    }

    // This should never happen due to parser validation, but TypeScript needs exhaustiveness
    return {
        type: 'error',
        message: `Unknown action: ${action}`
    }
}

