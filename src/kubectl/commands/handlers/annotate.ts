import type { ClusterStateData } from '../../../cluster/ClusterState'
import type { ParsedCommand } from '../types'
import type { ExecutionResult } from '../../../shared/result'
import { handleMetadataChange } from './metadataHelpers'

// ═══════════════════════════════════════════════════════════════════════════
// KUBECTL ANNOTATE HANDLER
// ═══════════════════════════════════════════════════════════════════════════
// Handle kubectl annotate command: add, update, or remove annotations on resources
// Uses generic metadata handler with annotation-specific configuration

/**
 * Handle kubectl annotate command
 * Supports pods, configmaps, and secrets
 */
export const handleAnnotate = (
    state: ClusterStateData,
    parsed: ParsedCommand
): ExecutionResult & { state?: ClusterStateData } => {
    return handleMetadataChange(state, parsed, {
        metadataType: 'annotations',
        commandName: 'annotate',
        changesKey: 'annotationChanges',
        actionPastTense: 'annotated',
    })
}

