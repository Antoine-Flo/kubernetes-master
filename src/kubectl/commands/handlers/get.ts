import type { ClusterStateData } from '../../../cluster/ClusterState'
import type { ParsedCommand } from '../types'
import { formatTable, formatAge } from '../../../shared/formatter'

/**
 * Handle kubectl get command
 * Uses shared table formatter for kubectl-style output
 */
export const handleGet = (state: ClusterStateData, parsed: ParsedCommand): string => {
    const namespace = parsed.namespace || 'default'

    if (parsed.resource === 'pods') {
        const pods = state.pods.filter(p => p.metadata.namespace === namespace)

        if (pods.length === 0) {
            return 'No resources found'
        }

        // Format pods as table using shared formatter
        const headers = ['name', 'status', 'age']
        const rows = pods.map(pod => [
            pod.metadata.name,
            pod.status.phase,
            formatAge(pod.metadata.creationTimestamp)
        ])

        return formatTable(headers, rows)
    }

    if (parsed.resource === 'deployments') {
        return 'No resources found'
    }

    if (parsed.resource === 'services') {
        return 'No resources found'
    }

    if (parsed.resource === 'namespaces') {
        const headers = ['name', 'status', 'age']
        const rows = [
            ['default', 'Active', '5d'],
            ['kube-system', 'Active', '5d']
        ]
        return formatTable(headers, rows)
    }

    return `Placeholder: get ${parsed.resource}`
}

