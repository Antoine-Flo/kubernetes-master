import type { ClusterStateData } from '../../../cluster/ClusterState'
import type { ParsedCommand } from '../types'

/**
 * Handle kubectl get command
 * Placeholder implementation - real formatting will be added in Sprint 5
 */
export const handleGet = (state: ClusterStateData, parsed: ParsedCommand): string => {
    const namespace = parsed.namespace || 'default'

    if (parsed.resource === 'pods') {
        const pods = state.pods.filter(p => p.metadata.namespace === namespace)

        if (pods.length === 0) {
            return 'No resources found'
        }

        // Placeholder table format - will be replaced with proper table formatter in Sprint 5
        const lines = ['NAME                STATUS    AGE']
        lines.push(...pods.map(pod =>
            `${pod.metadata.name.padEnd(20)}${pod.status.phase.padEnd(10)}${getAge(pod.metadata.creationTimestamp)}`
        ))

        return lines.join('\n')
    }

    if (parsed.resource === 'deployments') {
        return 'No resources found'
    }

    if (parsed.resource === 'services') {
        return 'No resources found'
    }

    if (parsed.resource === 'namespaces') {
        return 'NAME          STATUS   AGE\ndefault       Active   5d\nkube-system   Active   5d'
    }

    return `Placeholder: get ${parsed.resource}`
}

// Helper to calculate age (simplified)
const getAge = (timestamp: string): string => {
    const now = new Date()
    const created = new Date(timestamp)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return '0m'
    if (diffMins < 60) return `${diffMins}m`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d`
}

