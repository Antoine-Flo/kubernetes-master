import type { ClusterStateData } from '../../../cluster/ClusterState'
import type { ParsedCommand } from '../types'
import type { ExecutionResult, Result } from '../../../shared/result'
import { success, error } from '../../../shared/result'
import type { Pod } from '../../../cluster/ressources/Pod'
import type { ConfigMap } from '../../../cluster/ressources/ConfigMap'
import type { Secret } from '../../../cluster/ressources/Secret'
import { deepFreeze } from '../../../shared/deepFreeze'

// ═══════════════════════════════════════════════════════════════════════════
// METADATA HELPERS (LABELS & ANNOTATIONS)
// ═══════════════════════════════════════════════════════════════════════════
// Generic helpers for handling labels and annotations on Kubernetes resources

type ResourceWithMetadata = Pod | ConfigMap | Secret
type MetadataType = 'labels' | 'annotations'

/**
 * Apply metadata changes (labels or annotations) to a resource
 * Returns error if trying to overwrite without --overwrite flag
 */
/**
 * Remove a key from metadata object (pure function)
 */
const removeKey = (metadata: Record<string, string>, key: string): Record<string, string> => {
    return Object.fromEntries(
        Object.entries(metadata).filter(([k]) => k !== key)
    )
}

const applyMetadataChanges = (
    resource: ResourceWithMetadata,
    changes: Record<string, string | null>,
    overwrite: boolean,
    metadataType: MetadataType
): Result<ResourceWithMetadata> => {
    const currentMetadata = resource.metadata[metadataType] || {}
    let newMetadata = { ...currentMetadata }

    // Apply each change
    for (const [key, value] of Object.entries(changes)) {
        if (value === null) {
            // Removal: key- (filter out the key)
            newMetadata = removeKey(newMetadata, key)
        } else {
            // Addition or update
            if (currentMetadata[key] !== undefined && !overwrite) {
                const type = metadataType === 'labels' ? 'label' : 'annotation'
                return error(`${type} "${key}" already exists, use --overwrite to update`)
            }
            newMetadata = { ...newMetadata, [key]: value }
        }
    }

    // Create updated resource with new metadata
    const updated = {
        ...resource,
        metadata: {
            ...resource.metadata,
            [metadataType]: Object.keys(newMetadata).length > 0 ? newMetadata : undefined,
        },
    }

    return success(deepFreeze(updated) as ResourceWithMetadata)
}

/**
 * Configuration for metadata operation
 */
interface MetadataOperationConfig {
    metadataType: MetadataType
    commandName: 'label' | 'annotate'
    changesKey: 'labelChanges' | 'annotationChanges'
    actionPastTense: 'labeled' | 'annotated'
}

/**
 * Resource collection accessor - declarative mapping
 */
interface ResourceCollectionAccessor<T extends ResourceWithMetadata> {
    getItems: (state: ClusterStateData) => T[]
    setItems: (state: ClusterStateData, items: T[]) => ClusterStateData
    resourceTypeName: string // For error messages (capitalized: "Pod")
    singularName: string // For success messages (lowercase: "pod")
}

/**
 * Resource collection accessors (object lookup pattern)
 */
const RESOURCE_ACCESSORS: Record<string, ResourceCollectionAccessor<ResourceWithMetadata>> = {
    pods: {
        getItems: (state) => state.pods.items as ResourceWithMetadata[],
        setItems: (state, items) => ({ ...state, pods: { items: items as Pod[] } }),
        resourceTypeName: 'Pod',
        singularName: 'pod',
    },
    configmaps: {
        getItems: (state) => state.configMaps.items as ResourceWithMetadata[],
        setItems: (state, items) => ({ ...state, configMaps: { items: items as ConfigMap[] } }),
        resourceTypeName: 'ConfigMap',
        singularName: 'configmap',
    },
    secrets: {
        getItems: (state) => state.secrets.items as ResourceWithMetadata[],
        setItems: (state, items) => ({ ...state, secrets: { items: items as Secret[] } }),
        resourceTypeName: 'Secret',
        singularName: 'secret',
    },
}

/**
 * Generic resource updater - works for any resource type
 * Pure function that finds, updates, and returns new state
 */
const updateResource = <T extends ResourceWithMetadata>(
    state: ClusterStateData,
    resourceType: string,
    name: string,
    namespace: string,
    updateFn: (resource: T) => Result<T>,
    actionPastTense: string
): ExecutionResult & { state?: ClusterStateData } => {
    const accessor = RESOURCE_ACCESSORS[resourceType]
    if (!accessor) {
        return error(`Resource type "${resourceType}" is not supported`)
    }

    const items = accessor.getItems(state) as T[]
    const resource = items.find(
        (r) => r.metadata.name === name && r.metadata.namespace === namespace
    )

    if (!resource) {
        return error(`${accessor.resourceTypeName} "${name}" not found in namespace "${namespace}"`)
    }

    const updateResult = updateFn(resource)
    if (!updateResult.ok) {
        return updateResult
    }

    const updatedItems = items.map((r) =>
        r.metadata.name === name && r.metadata.namespace === namespace
            ? updateResult.value
            : r
    )

    return {
        ok: true,
        value: `${accessor.singularName}/${name} ${actionPastTense}`,
        state: accessor.setItems(state, updatedItems),
    }
}

/**
 * Generic handler for metadata changes (labels or annotations)
 * Strategy pattern: configurable behavior via config object
 */
export const handleMetadataChange = (
    state: ClusterStateData,
    parsed: ParsedCommand,
    config: MetadataOperationConfig
): ExecutionResult & { state?: ClusterStateData } => {
    const namespace = parsed.namespace || 'default'

    // Validate resource name
    if (!parsed.name) {
        return error(`Resource name is required for ${config.commandName} command`)
    }

    // Validate metadata changes
    const changes = parsed[config.changesKey]
    if (!changes || Object.keys(changes).length === 0) {
        const changeName = config.metadataType === 'labels' ? 'label' : 'annotation'
        return error(`No ${changeName} changes provided`)
    }

    const overwrite = parsed.flags['overwrite'] === true

    // Create update function for the resource
    const updateFn = (resource: ResourceWithMetadata) =>
        applyMetadataChanges(resource, changes, overwrite, config.metadataType)

    return updateResource(
        state,
        parsed.resource,
        parsed.name,
        namespace,
        updateFn,
        config.actionPastTense
    )
}

