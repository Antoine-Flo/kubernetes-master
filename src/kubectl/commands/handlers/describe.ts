import type { ClusterStateData } from '../../../cluster/ClusterState'
import type { ParsedCommand } from '../types'

/**
 * Handle kubectl describe command
 * Placeholder implementation - real formatting will be added in Sprint 5
 */
export const handleDescribe = (
    state: ClusterStateData,
    parsed: ParsedCommand
): { type: 'success'; output: string } | { type: 'error'; message: string } => {
    const namespace = parsed.namespace || 'default'

    if (!parsed.name) {
        return {
            type: 'error',
            message: `Resource name is required for describe command`
        }
    }

    if (parsed.resource === 'pods') {
        const pod = state.pods.find(
            p => p.metadata.name === parsed.name && p.metadata.namespace === namespace
        )

        if (!pod) {
            return {
                type: 'error',
                message: `Pod "${parsed.name}" not found in namespace "${namespace}"`
            }
        }

        // Placeholder detailed format - will be replaced with proper formatter in Sprint 5
        const lines = [
            `Name:         ${pod.metadata.name}`,
            `Namespace:    ${pod.metadata.namespace}`,
            `Status:       ${pod.status.phase}`,
            `IP:           172.17.0.${Math.floor(Math.random() * 255)}`,
            `Containers:`,
            ...pod.spec.containers.map(c => `  ${c.name}:`),
            ...pod.spec.containers.map(c => `    Image: ${c.image}`)
        ]

        return {
            type: 'success',
            output: lines.join('\n')
        }
    }

    return {
        type: 'success',
        output: `Placeholder: describe ${parsed.resource} ${parsed.name}`
    }
}

