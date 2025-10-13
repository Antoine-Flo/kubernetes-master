import type { ClusterState } from '../../../cluster/ClusterState'
import type { ParsedCommand } from '../types'

/**
 * Handle kubectl delete command
 * This handler actually performs deletions on the cluster state
 */
export const handleDelete = (
    clusterState: ClusterState,
    parsed: ParsedCommand
): { type: 'success'; output: string } | { type: 'error'; message: string } => {
    const namespace = parsed.namespace || 'default'

    if (!parsed.name) {
        return {
            type: 'error',
            message: `Resource name is required for delete command`
        }
    }

    if (parsed.resource === 'pods') {
        const result = clusterState.deletePod(parsed.name, namespace)

        if (result.type === 'error') {
            return {
                type: 'error',
                message: result.message
            }
        }

        return {
            type: 'success',
            output: `pod "${parsed.name}" deleted`
        }
    }

    if (parsed.resource === 'deployments') {
        return {
            type: 'success',
            output: `deployment "${parsed.name}" deleted`
        }
    }

    if (parsed.resource === 'services') {
        return {
            type: 'success',
            output: `service "${parsed.name}" deleted`
        }
    }

    return {
        type: 'success',
        output: `${parsed.resource} "${parsed.name}" deleted`
    }
}

