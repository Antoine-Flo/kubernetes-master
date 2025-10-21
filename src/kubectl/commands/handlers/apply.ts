// ═══════════════════════════════════════════════════════════════════════════
// KUBECTL APPLY HANDLER
// ═══════════════════════════════════════════════════════════════════════════
// Handle kubectl apply command - create or update resources from YAML files
// Now uses event-driven architecture

import type { ClusterState } from '../../../cluster/ClusterState'
import type { EventBus } from '../../../cluster/events/EventBus'
import type { FileSystem } from '../../../filesystem/FileSystem'
import type { ExecutionResult } from '../../../shared/result'
import { error } from '../../../shared/result'
import { parseKubernetesYaml } from '../../yamlParser'
import type { ParsedCommand } from '../types'
import { applyResource, applyResourceWithEvents, createResourceOps } from './resourceHelpers'

/**
 * Handle kubectl apply command
 * Creates or updates resources from YAML files
 * 
 * @param fileSystem - Virtual filesystem to read files from
 * @param clusterState - Cluster state to apply resources to
 * @param parsed - Parsed command with flags
 * @param eventBus - Optional EventBus for event-driven architecture
 * @returns ExecutionResult with success message or error
 */
export const handleApply = (
    fileSystem: FileSystem,
    clusterState: ClusterState,
    parsed: ParsedCommand,
    eventBus?: EventBus
): ExecutionResult => {
    // Extract filename from flags
    const filename = parsed.flags.f || parsed.flags.filename

    if (!filename) {
        return error('Error: filename is required (use -f or --filename)')
    }

    // Read file from filesystem
    const fileResult = fileSystem.readFile(filename as string)
    if (!fileResult.ok) {
        return error(`Error: ${fileResult.error}`)
    }

    // Parse and validate YAML
    const parseResult = parseKubernetesYaml(fileResult.value)
    if (!parseResult.ok) {
        return error(`Error: ${parseResult.error}`)
    }

    const resource = parseResult.value

    // Use event-driven approach if EventBus is provided
    if (eventBus) {
        return applyResourceWithEvents(resource, clusterState, eventBus)
    }

    // Fallback to direct approach for backward compatibility
    return applyResource(resource, createResourceOps(clusterState, resource.kind))
}
