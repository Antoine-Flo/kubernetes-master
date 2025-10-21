import type { ClusterState } from '../../../cluster/ClusterState'
import type { EventBus } from '../../../cluster/events/EventBus'
import {
    createConfigMapDeletedEvent,
    createPodDeletedEvent,
    createSecretDeletedEvent,
} from '../../../cluster/events/types'
import type { ExecutionResult } from '../../../shared/result'
import { error, success } from '../../../shared/result'
import type { ParsedCommand } from '../types'

/**
 * Handle kubectl delete command
 * This handler actually performs deletions on the cluster state
 * Now uses event-driven architecture
 */
export const handleDelete = (
    clusterState: ClusterState,
    parsed: ParsedCommand,
    eventBus?: EventBus
): ExecutionResult => {
    const namespace = parsed.namespace || 'default'

    if (!parsed.name) {
        return error(`Resource name is required for delete command`)
    }

    // Use event-driven approach if EventBus is provided
    if (eventBus) {
        if (parsed.resource === 'pods' || parsed.resource === 'pod') {
            const findResult = clusterState.findPod(parsed.name, namespace)
            if (!findResult.ok) {
                return error(findResult.error)
            }
            eventBus.emit(createPodDeletedEvent(parsed.name, namespace, findResult.value, 'kubectl'))
            return success(`pod "${parsed.name}" deleted`)
        }

        if (parsed.resource === 'configmaps' || parsed.resource === 'configmap' || parsed.resource === 'cm') {
            const findResult = clusterState.findConfigMap(parsed.name, namespace)
            if (!findResult.ok) {
                return error(findResult.error)
            }
            eventBus.emit(createConfigMapDeletedEvent(parsed.name, namespace, findResult.value, 'kubectl'))
            return success(`configmap "${parsed.name}" deleted`)
        }

        if (parsed.resource === 'secrets' || parsed.resource === 'secret') {
            const findResult = clusterState.findSecret(parsed.name, namespace)
            if (!findResult.ok) {
                return error(findResult.error)
            }
            eventBus.emit(createSecretDeletedEvent(parsed.name, namespace, findResult.value, 'kubectl'))
            return success(`secret "${parsed.name}" deleted`)
        }

        if (parsed.resource === 'deployments') {
            return success(`deployment "${parsed.name}" deleted`)
        }

        if (parsed.resource === 'services') {
            return success(`service "${parsed.name}" deleted`)
        }

        return success(`${parsed.resource} "${parsed.name}" deleted`)
    }

    // Fallback to direct approach for backward compatibility
    if (parsed.resource === 'pods') {
        const result = clusterState.deletePod(parsed.name, namespace)

        if (!result.ok) {
            return error(result.error)
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

