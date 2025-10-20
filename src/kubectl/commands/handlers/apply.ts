// ═══════════════════════════════════════════════════════════════════════════
// KUBECTL APPLY HANDLER
// ═══════════════════════════════════════════════════════════════════════════
// Handle kubectl apply command - create or update resources from YAML files

import type { ParsedCommand } from '../types'
import type { FileSystem } from '../../../filesystem/FileSystem'
import type { ClusterState } from '../../../cluster/ClusterState'
import type { ExecutionResult } from '../../../shared/result'
import { error } from '../../../shared/result'
import { parseKubernetesYaml } from '../../yamlParser'
import { applyResource, createResourceOps } from './resourceHelpers'

/**
 * Handle kubectl apply command
 * Creates or updates resources from YAML files
 * 
 * @param fileSystem - Virtual filesystem to read files from
 * @param clusterState - Cluster state to apply resources to
 * @param parsed - Parsed command with flags
 * @returns ExecutionResult with success message or error
 */
export const handleApply = (
    fileSystem: FileSystem,
    clusterState: ClusterState,
    parsed: ParsedCommand
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

    // Apply resource using generic helper
    return applyResource(resource, createResourceOps(clusterState, resource.kind))
}
