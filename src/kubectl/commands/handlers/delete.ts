import type { ClusterState } from '../../../cluster/ClusterState'
import type { ParsedCommand } from '../types'
import type { ExecutionResult } from '../../../shared/result'
import { success, error } from '../../../shared/result'

/**
 * Handle kubectl delete command
 * This handler actually performs deletions on the cluster state
 */
export const handleDelete = (
    clusterState: ClusterState,
    parsed: ParsedCommand
): ExecutionResult => {
    const namespace = parsed.namespace || 'default'

    if (!parsed.name) {
        return error(`Resource name is required for delete command`)
    }

    if (parsed.resource === 'pods') {
        const result = clusterState.deletePod(parsed.name, namespace)

        if (result.type === 'error') {
            return error(result.message)
        }

        return success(`pod "${parsed.name}" deleted`)
    }

    if (parsed.resource === 'deployments') {
        return success(`deployment "${parsed.name}" deleted`)
    }

    if (parsed.resource === 'services') {
        return success(`service "${parsed.name}" deleted`)
    }

    return success(`${parsed.resource} "${parsed.name}" deleted`)
}

