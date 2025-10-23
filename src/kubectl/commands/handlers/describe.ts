import type { ClusterStateData } from '../../../cluster/ClusterState'
import type { ExecutionResult } from '../../../shared/result'
import { error, success } from '../../../shared/result'
import { describeConfigMap, describePod, describeSecret } from '../../formatters/describeFormatters'
import type { ParsedCommand } from '../types'

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
        return error(`error: you must specify the name of the resource to describe`)
    }

    const config = DESCRIBE_CONFIG[parsed.resource]
    if (!config) {
        return error(`error: the server doesn't have a resource type "${parsed.resource}"`)
    }

    const namespace = parsed.namespace || 'default'
    const resource = (state[config.items] as any).items.find(
        (item: any) => item.metadata.name === parsed.name && item.metadata.namespace === namespace
    )

    if (!resource) {
        return error(`Error from server (NotFound): ${parsed.resource} "${parsed.name}" not found`)
    }

    return success(config.formatter(resource))
}

