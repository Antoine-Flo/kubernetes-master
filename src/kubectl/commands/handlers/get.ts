import type { ClusterStateData } from '../../../cluster/ClusterState'
import type { ParsedCommand } from '../types'
import { formatTable, formatAge } from '../../../shared/formatter'
import type { Pod } from '../../../cluster/models/Pod'
import type { ConfigMap } from '../../../cluster/models/ConfigMap'
import type { Secret, SecretType } from '../../../cluster/models/Secret'

// ═══════════════════════════════════════════════════════════════════════════
// KUBECTL GET HANDLER
// ═══════════════════════════════════════════════════════════════════════════
// Each resource defines how to fetch, format, and display its data

interface ResourceWithLabels {
    metadata: {
        namespace: string
        labels?: Record<string, string>
    }
}

/**
 * Resource handler configuration
 * Declarative approach: each resource defines its behavior via config
 */
interface ResourceHandler<T extends ResourceWithLabels> {
    getItems: (state: ClusterStateData) => T[]
    headers: string[]
    formatRow: (item: T) => string[]
    supportsFiltering: boolean  // For future: namespaces don't support filtering
}

/**
 * Filter resources by label selector
 * Pure function that matches all labels in selector
 */
const filterByLabels = <T extends ResourceWithLabels>(
    resources: T[],
    selector: Record<string, string>
): T[] => {
    return resources.filter(resource => {
        const labels = resource.metadata.labels || {}
        return Object.entries(selector).every(([key, value]) => labels[key] === value)
    })
}

/**
 * Filter resources by namespace
 * Pure function for namespace filtering
 */
const filterByNamespace = <T extends ResourceWithLabels>(
    resources: T[],
    namespace: string
): T[] => {
    return resources.filter(resource => resource.metadata.namespace === namespace)
}

/**
 * Apply all filters to resources
 * Pure function that chains namespace and label filtering
 */
const applyFilters = <T extends ResourceWithLabels>(
    resources: T[],
    namespace: string,
    selector?: Record<string, string>
): T[] => {
    let filtered = filterByNamespace(resources, namespace)
    if (selector) {
        filtered = filterByLabels(filtered, selector)
    }
    return filtered
}

/**
 * Get secret type string from ADT
 * Pure function that extracts type string for display
 */
const getSecretType = (secretType: SecretType): string => {
    return secretType.type
}

// ─── Resource Handlers Configuration ─────────────────────────────────────
// Object lookup pattern (like executor.ts) - add new resource = add config

const RESOURCE_HANDLERS: Record<string, ResourceHandler<any>> = {
    pods: {
        getItems: (state) => state.pods.items,
        headers: ['name', 'status', 'age'],
        formatRow: (pod: Pod) => [
            pod.metadata.name,
            pod.status.phase,
            formatAge(pod.metadata.creationTimestamp)
        ],
        supportsFiltering: true
    },

    configmaps: {
        getItems: (state) => state.configMaps.items,
        headers: ['name', 'data', 'age'],
        formatRow: (cm: ConfigMap) => [
            cm.metadata.name,
            Object.keys(cm.data || {}).length.toString(),
            formatAge(cm.metadata.creationTimestamp)
        ],
        supportsFiltering: true
    },

    secrets: {
        getItems: (state) => state.secrets.items,
        headers: ['name', 'type', 'data', 'age'],
        formatRow: (secret: Secret) => [
            secret.metadata.name,
            getSecretType(secret.type),
            Object.keys(secret.data || {}).length.toString(),
            formatAge(secret.metadata.creationTimestamp)
        ],
        supportsFiltering: true
    }
}

// ─── Special Cases ───────────────────────────────────────────────────────
// Resources that don't follow standard pattern (hardcoded data, no filtering)

const SPECIAL_HANDLERS: Record<string, () => string> = {
    namespaces: () => {
        const headers = ['name', 'status', 'age']
        const rows = [
            ['default', 'Active', '5d'],
            ['kube-system', 'Active', '5d']
        ]
        return formatTable(headers, rows)
    },

    deployments: () => 'No resources found',
    services: () => 'No resources found'
}

// ─── Main Handler ────────────────────────────────────────────────────────

/**
 * Handle kubectl get command
 * Strategy pattern: delegate to resource-specific handler configuration
 */
export const handleGet = (state: ClusterStateData, parsed: ParsedCommand): string => {
    // Check special handlers first (no filtering, hardcoded responses)
    const specialHandler = SPECIAL_HANDLERS[parsed.resource]
    if (specialHandler) {
        return specialHandler()
    }

    // Standard resource handling with filtering
    const handler = RESOURCE_HANDLERS[parsed.resource]
    if (!handler) {
        return 'No resources found'
    }

    // Get items and apply filters
    const namespace = parsed.namespace || 'default'
    const items = handler.getItems(state)
    const filtered = applyFilters(items, namespace, parsed.selector)

    // Empty result
    if (filtered.length === 0) {
        return 'No resources found'
    }

    // Format as table
    const rows = filtered.map(handler.formatRow)
    return formatTable(handler.headers, rows)
}

