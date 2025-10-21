import type { ClusterState } from '../../cluster/ClusterState'
import type { EventBus } from '../../cluster/events/EventBus'
import type { FileSystem } from '../../filesystem/FileSystem'
import type { Logger } from '../../logger/Logger'
import type { ExecutionResult } from '../../shared/result'
import { error, success } from '../../shared/result'
import { handleAnnotate } from './handlers/annotate'
import { handleApply } from './handlers/apply'
import { handleCreate } from './handlers/create'
import { handleDelete } from './handlers/delete'
import { handleDescribe } from './handlers/describe'
import { handleExec } from './handlers/exec'
import { handleGet } from './handlers/get'
import { handleLabel } from './handlers/label'
import { handleLogs } from './handlers/logs'
import { parseCommand } from './parser'
import type { ParsedCommand } from './types'

// Action handler signature (dependencies captured in closure)
type ActionHandler = (parsed: ParsedCommand) => ExecutionResult

/**
 * Create action handlers Map with dependencies captured in closures
 */
const createHandlers = (
    clusterState: ClusterState,
    fileSystem: FileSystem,
    logger: Logger,
    eventBus?: EventBus
): Map<string, ActionHandler> => {
    // Currying helper: pre-applies logger, clusterState, fileSystem, and eventBus
    const withDeps = <TArgs extends any[]>(
        handler: (logger: Logger, cluster: ClusterState, fs: FileSystem, eventBus: EventBus | undefined, ...args: TArgs) => ExecutionResult
    ) => (...args: TArgs) => handler(logger, clusterState, fileSystem, eventBus, ...args)

    const handlers = new Map<string, ActionHandler>()

    // Ultra-concis: une ligne par handler, avec logging intégré
    handlers.set('get', withDeps(handleGetWrapper))
    handlers.set('describe', withDeps(handleDescribeWrapper))
    handlers.set('delete', withDeps(handleDeleteWrapper))
    handlers.set('apply', withDeps(handleApplyWrapper))
    handlers.set('create', withDeps(handleCreateWrapper))
    handlers.set('logs', withDeps(handleLogsWrapper))
    handlers.set('exec', withDeps(handleExecWrapper))
    handlers.set('label', withDeps(handleLabelWrapper))
    handlers.set('annotate', withDeps(handleAnnotateWrapper))

    return handlers
}

// ─── Handler Wrappers (with logging) ────────────────────────────────────

const handleGetWrapper = (logger: Logger, cluster: ClusterState, _fs: FileSystem, _eventBus: EventBus | undefined, parsed: ParsedCommand): ExecutionResult => {
    logger.debug('CLUSTER', `Getting ${parsed.resource} in namespace ${parsed.namespace || 'default'}`)
    const output = handleGet(cluster.toJSON(), parsed)
    return success(output)
}

const handleDescribeWrapper = (logger: Logger, cluster: ClusterState, _fs: FileSystem, _eventBus: EventBus | undefined, parsed: ParsedCommand): ExecutionResult => {
    logger.debug('CLUSTER', `Describing ${parsed.resource}: ${parsed.name || 'all'}`)
    return handleDescribe(cluster.toJSON(), parsed)
}

const handleDeleteWrapper = (logger: Logger, cluster: ClusterState, _fs: FileSystem, eventBus: EventBus | undefined, parsed: ParsedCommand): ExecutionResult => {
    logger.debug('CLUSTER', `Deleting ${parsed.resource}: ${parsed.name}`)
    const result = handleDelete(cluster, parsed, eventBus)
    if (result.ok) {
        logger.info('CLUSTER', `Deleted ${parsed.resource}: ${parsed.name}`)
    }
    return result
}

const handleApplyWrapper = (logger: Logger, cluster: ClusterState, fs: FileSystem, eventBus: EventBus | undefined, parsed: ParsedCommand): ExecutionResult => {
    const file = parsed.flags.f || parsed.flags.filename
    logger.debug('CLUSTER', `Applying resource from file: ${file}`)
    const result = handleApply(fs, cluster, parsed, eventBus)
    if (result.ok) {
        logger.info('CLUSTER', 'Resource applied successfully')
    }
    return result
}

const handleCreateWrapper = (logger: Logger, cluster: ClusterState, fs: FileSystem, eventBus: EventBus | undefined, parsed: ParsedCommand): ExecutionResult => {
    const file = parsed.flags.f || parsed.flags.filename
    logger.debug('CLUSTER', `Creating resource from file: ${file}`)
    const result = handleCreate(fs, cluster, parsed, eventBus)
    if (result.ok) {
        logger.info('CLUSTER', 'Resource created successfully')
    }
    return result
}

const handleLogsWrapper = (logger: Logger, cluster: ClusterState, _fs: FileSystem, _eventBus: EventBus | undefined, parsed: ParsedCommand): ExecutionResult => {
    logger.debug('CLUSTER', `Getting logs for pod: ${parsed.name}`)
    const output = handleLogs(cluster.toJSON(), parsed)
    return success(output)
}

const handleExecWrapper = (logger: Logger, cluster: ClusterState, _fs: FileSystem, _eventBus: EventBus | undefined, parsed: ParsedCommand): ExecutionResult => {
    const command = parsed.execCommand?.join(' ') || 'unknown'
    logger.debug('CLUSTER', `Executing command in pod ${parsed.name}: ${command}`)
    const output = handleExec(cluster.toJSON(), parsed)
    return success(output)
}

const handleLabelWrapper = (logger: Logger, cluster: ClusterState, _fs: FileSystem, _eventBus: EventBus | undefined, parsed: ParsedCommand): ExecutionResult => {
    logger.debug('CLUSTER', `Labeling ${parsed.resource}: ${parsed.name}`)
    const result = handleLabel(cluster.toJSON(), parsed)
    if (result.ok && result.state) {
        cluster.loadState(result.state)
        logger.info('CLUSTER', `Labeled ${parsed.resource}: ${parsed.name}`)
    }
    return result.ok && result.state
        ? { ok: true, value: result.value }
        : result
}

const handleAnnotateWrapper = (logger: Logger, cluster: ClusterState, _fs: FileSystem, _eventBus: EventBus | undefined, parsed: ParsedCommand): ExecutionResult => {
    logger.debug('CLUSTER', `Annotating ${parsed.resource}: ${parsed.name}`)
    const result = handleAnnotate(cluster.toJSON(), parsed)
    if (result.ok && result.state) {
        cluster.loadState(result.state)
        logger.info('CLUSTER', `Annotated ${parsed.resource}: ${parsed.name}`)
    }
    return result.ok && result.state
        ? { ok: true, value: result.value }
        : result
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
 * Factory function that encapsulates ClusterState, FileSystem, Logger, and EventBus in closures
 * 
 * @param clusterState - The cluster state to operate on
 * @param fileSystem - The filesystem to read YAML files from
 * @param logger - Application logger for tracking commands
 * @param eventBus - Optional EventBus for event-driven architecture
 * @returns Executor with execute method
 */
export const createKubectlExecutor = (
    clusterState: ClusterState,
    fileSystem: FileSystem,
    logger: Logger,
    eventBus?: EventBus
) => {
    const handlers = createHandlers(clusterState, fileSystem, logger, eventBus)

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

