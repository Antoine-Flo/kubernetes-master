import type { ClusterState } from '../../cluster/ClusterState'
import { parseCommand } from './parser'
import type { ParsedCommand } from './types'
import { handleGet } from './handlers/get'
import { handleDescribe } from './handlers/describe'
import { handleDelete } from './handlers/delete'
import { handleApply } from './handlers/apply'
import { handleCreate } from './handlers/create'
import type { ExecutionResult } from '../../shared/result'
import { error, success } from '../../shared/result'
import type { Logger } from '../../logger/Logger'

/**
 * Kubectl executor interface
 */
export interface KubectlExecutor {
    execute: (input: string) => ExecutionResult
}

// Action handler signature (dependencies captured in closure)
type ActionHandler = (parsed: ParsedCommand) => ExecutionResult

/**
 * Create action handlers Map with dependencies captured in closures
 */
const createHandlers = (clusterState: ClusterState, logger: Logger): Map<string, ActionHandler> => {
    // Currying helper: pre-applies logger and clusterState
    const withDeps = <TArgs extends any[]>(
        handler: (logger: Logger, cluster: ClusterState, ...args: TArgs) => ExecutionResult
    ) => (...args: TArgs) => handler(logger, clusterState, ...args)

    const handlers = new Map<string, ActionHandler>()

    // Ultra-concis: une ligne par handler, avec logging intégré
    handlers.set('get', withDeps(handleGetWrapper))
    handlers.set('describe', withDeps(handleDescribeWrapper))
    handlers.set('delete', withDeps(handleDeleteWrapper))
    handlers.set('apply', withDeps(handleApplyWrapper))
    handlers.set('create', withDeps(handleCreateWrapper))

    return handlers
}

// ─── Handler Wrappers (with logging) ────────────────────────────────────

const handleGetWrapper = (logger: Logger, cluster: ClusterState, parsed: ParsedCommand): ExecutionResult => {
    logger.debug('CLUSTER', `Getting ${parsed.resource} in namespace ${parsed.namespace || 'default'}`)
    const output = handleGet(cluster.toJSON(), parsed)
    return success(output)
}

const handleDescribeWrapper = (logger: Logger, cluster: ClusterState, parsed: ParsedCommand): ExecutionResult => {
    logger.debug('CLUSTER', `Describing ${parsed.resource}: ${parsed.name || 'all'}`)
    return handleDescribe(cluster.toJSON(), parsed)
}

const handleDeleteWrapper = (logger: Logger, cluster: ClusterState, parsed: ParsedCommand): ExecutionResult => {
    logger.debug('CLUSTER', `Deleting ${parsed.resource}: ${parsed.name}`)
    const result = handleDelete(cluster, parsed)
    if (result.ok) {
        logger.info('CLUSTER', `Deleted ${parsed.resource}: ${parsed.name}`)
    }
    return result
}

const handleApplyWrapper = (logger: Logger, _cluster: ClusterState, parsed: ParsedCommand): ExecutionResult => {
    const file = parsed.flags.f || parsed.flags.filename
    logger.debug('CLUSTER', `Applying resource from file: ${file}`)
    const output = handleApply(parsed)
    logger.info('CLUSTER', 'Resource applied successfully')
    return success(output)
}

const handleCreateWrapper = (logger: Logger, _cluster: ClusterState, parsed: ParsedCommand): ExecutionResult => {
    const file = parsed.flags.f || parsed.flags.filename
    logger.debug('CLUSTER', `Creating resource from file: ${file}`)
    const output = handleCreate(parsed)
    logger.info('CLUSTER', 'Resource created successfully')
    return success(output)
}

/**
 * Route parsed command to handler from Map
 */
const routeCommand = (
    handlers: Map<string, ActionHandler>,
    parsed: ParsedCommand,
    logger: Logger
): ExecutionResult => {
    const handler = handlers.get(parsed.action)

    if (!handler) {
        logger.error('EXECUTOR', `Unknown action: ${parsed.action}`)
        return error(`Unknown action: ${parsed.action}`)
    }

    const result = handler(parsed)

    // Log errors (success already logged in wrappers)
    if (!result.ok) {
        logger.error('CLUSTER', `${parsed.action} failed: ${result.error}`)
    }

    return result
}

/**
 * Create a kubectl executor
 * Factory function that encapsulates ClusterState and Logger in closures
 * 
 * @param clusterState - The cluster state to operate on
 * @param logger - Application logger for tracking commands
 * @returns Executor with execute method
 */
export const createKubectlExecutor = (clusterState: ClusterState, logger: Logger): KubectlExecutor => {
    const handlers = createHandlers(clusterState, logger)

    const execute = (input: string): ExecutionResult => {
        logger.info('COMMAND', `Kubectl: ${input}`)

        const parseResult = parseCommand(input)
        if (!parseResult.ok) {
            logger.error('EXECUTOR', `Parse error: ${parseResult.error}`)
            return error(parseResult.error)
        }

        return routeCommand(handlers, parseResult.value, logger)
    }

    return { execute }
}

