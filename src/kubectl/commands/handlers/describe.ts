import type { ClusterStateData } from '../../../cluster/ClusterState'
import type { ParsedCommand } from '../types'
import type { ExecutionResult } from '../../../shared/result'
import { success, error } from '../../../shared/result'
import { describePod, describeConfigMap, describeSecret } from '../../formatters/describeFormatters'

// ═══════════════════════════════════════════════════════════════════════════
// KUBECTL DESCRIBE HANDLER
// ═══════════════════════════════════════════════════════════════════════════
// Configuration-driven approach: each resource defines its collection and formatter

/**
 * Resource describe configuration
 * Declarative approach similar to get.ts RESOURCE_HANDLERS
 */
interface DescribeConfig {
    items: keyof ClusterStateData
    formatter: (item: any) => string
    type: string
}

const DESCRIBE_CONFIG: Record<string, DescribeConfig> = {
    pods: {
        items: 'pods',
        formatter: describePod,
        type: 'Pod'
    },
    configmaps: {
        items: 'configMaps',
        formatter: describeConfigMap,
        type: 'ConfigMap'
    },
    secrets: {
        items: 'secrets',
        formatter: describeSecret,
        type: 'Secret'
    }
} as const

/**
 * Handle kubectl describe command
 * Provides detailed multi-line output for pods, configmaps, and secrets
 */
export const handleDescribe = (
    state: ClusterStateData,
    parsed: ParsedCommand
): ExecutionResult => {
    if (!parsed.name) {
        return error(`Resource name is required for describe command`)
    }

    const config = DESCRIBE_CONFIG[parsed.resource]
    if (!config) {
        return error(`Resource type "${parsed.resource}" is not supported by describe command`)
    }

    const namespace = parsed.namespace || 'default'
    const resource = (state[config.items] as any).items.find(
        (item: any) => item.metadata.name === parsed.name && item.metadata.namespace === namespace
    )

    if (!resource) {
        return error(`${config.type} "${parsed.name}" not found in namespace "${namespace}"`)
    }

    return success(config.formatter(resource))
}

