// ═══════════════════════════════════════════════════════════════════════════
// KUBECTL CREATE HANDLER
// ═══════════════════════════════════════════════════════════════════════════
// Handle kubectl create command - create resources from YAML files (fails if exists)
// Now uses event-driven architecture

import type { ClusterState } from '../../../cluster/ClusterState'
import type { EventBus } from '../../../cluster/events/EventBus'
import type { FileSystem } from '../../../filesystem/FileSystem'
import type { ExecutionResult } from '../../../shared/result'
import { error } from '../../../shared/result'
import { parseKubernetesYaml } from '../../yamlParser'
import type { ParsedCommand } from '../types'
import { createResource, createResourceOps, createResourceWithEvents } from './resourceHelpers'

/**
 * Handle kubectl create command
 * Creates resources from YAML files (fails if resource already exists)
 * 
 * @param fileSystem - Virtual filesystem to read files from
 * @param clusterState - Cluster state to create resources in
 * @param parsed - Parsed command with flags
 * @param eventBus - Optional EventBus for event-driven architecture
 * @returns ExecutionResult with success message or error
 */
export const handleCreate = (
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
        return createResourceWithEvents(resource, clusterState, eventBus)
    }

    // Fallback to direct approach for backward compatibility
    return createResource(resource, createResourceOps(clusterState, resource.kind))
}
