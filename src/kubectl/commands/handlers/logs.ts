import type { ClusterStateData } from '../../../cluster/ClusterState'
import type { ParsedCommand } from '../types'
import { generateLogs } from '../../../cluster/logGenerator'

// ═══════════════════════════════════════════════════════════════════════════
// KUBECTL LOGS HANDLER
// ═══════════════════════════════════════════════════════════════════════════
// Retrieves and displays pod logs with support for --tail and --follow flags

const DEFAULT_LOG_COUNT = 50

/**
 * Handle kubectl logs command
 * Supports:
 * - kubectl logs <pod>
 * - kubectl logs <pod> -n <namespace>
 * - kubectl logs <pod> --tail=20
 * - kubectl logs <pod> -f/--follow
 */
export const handleLogs = (state: ClusterStateData, parsed: ParsedCommand): string => {
    // Validate pod name is provided
    if (!parsed.name) {
        return 'Error: pod name is required'
    }

    const namespace = parsed.namespace || 'default'
    const podName = parsed.name

    // Find the pod
    const pod = state.pods.items.find(
        p => p.metadata.name === podName && p.metadata.namespace === namespace
    )

    if (!pod) {
        return `Error from server (NotFound): pods "${podName}" not found`
    }

    // Get or generate logs
    let logs = pod.status.logs || []

    if (logs.length === 0) {
        // Generate logs based on first container image
        const firstContainer = pod.spec.containers[0]
        if (firstContainer) {
            logs = generateLogs(firstContainer.image, DEFAULT_LOG_COUNT)
        }
    }

    // Apply --tail flag if present
    const tailValue = parsed.flags.tail
    if (tailValue !== undefined) {
        const tailCount = parseInt(tailValue as string, 10)

        if (isNaN(tailCount) || tailCount < 0) {
            return 'Error: --tail value must be a positive number'
        }

        if (tailCount === 0) {
            logs = []
        } else {
            logs = logs.slice(-tailCount)
        }
    }

    // Format logs
    let output = logs.join('\n')

    // Apply --follow flag if present
    const isFollow = parsed.flags.f === true || parsed.flags.follow === true
    if (isFollow && logs.length > 0) {
        output += '\n(following logs - press Ctrl+C to stop)'
    }

    return output
}

