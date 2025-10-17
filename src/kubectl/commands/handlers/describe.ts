import type { ClusterStateData } from '../../../cluster/ClusterState'
import type { ParsedCommand } from '../types'
import type { ExecutionResult } from '../../../shared/result'
import { success, error } from '../../../shared/result'
import { describePod, describeConfigMap, describeSecret } from '../../formatters/describeFormatters'

/**
 * Handle kubectl describe command
 * Provides detailed multi-line output for pods, configmaps, and secrets
 */
export const handleDescribe = (
    state: ClusterStateData,
    parsed: ParsedCommand
): ExecutionResult => {
    const namespace = parsed.namespace || 'default'

    if (!parsed.name) {
        return error(`Resource name is required for describe command`)
    }

    // Route to appropriate resource handler
    const handlers: Record<string, () => ExecutionResult> = {
        pods: () => {
            const pod = state.pods.items.find(
                p => p.metadata.name === parsed.name && p.metadata.namespace === namespace
            )

            if (!pod) {
                return error(`Pod "${parsed.name}" not found in namespace "${namespace}"`)
            }

            return success(describePod(pod))
        },

        configmaps: () => {
            const configMap = state.configMaps.items.find(
                cm => cm.metadata.name === parsed.name && cm.metadata.namespace === namespace
            )

            if (!configMap) {
                return error(`ConfigMap "${parsed.name}" not found in namespace "${namespace}"`)
            }

            return success(describeConfigMap(configMap))
        },

        secrets: () => {
            const secret = state.secrets.items.find(
                s => s.metadata.name === parsed.name && s.metadata.namespace === namespace
            )

            if (!secret) {
                return error(`Secret "${parsed.name}" not found in namespace "${namespace}"`)
            }

            return success(describeSecret(secret))
        }
    }

    const handler = handlers[parsed.resource]

    if (!handler) {
        return error(`Resource type "${parsed.resource}" is not supported by describe command`)
    }

    return handler()
}

