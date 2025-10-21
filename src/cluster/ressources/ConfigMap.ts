import { z } from 'zod'
import { deepFreeze } from '../../shared/deepFreeze'
import type { KubernetesResource } from '../repositories/types'
import type { Result } from '../../shared/result'
import { success, error } from '../../shared/result'

interface ConfigMapMetadata {
    name: string
    namespace: string
    labels?: Record<string, string>
    annotations?: Record<string, string>
    creationTimestamp: string
}

export interface ConfigMap extends KubernetesResource {
    apiVersion: 'v1'
    kind: 'ConfigMap'
    metadata: ConfigMapMetadata
    data?: Record<string, string>
    binaryData?: Record<string, string>
}

interface ConfigMapConfig {
    name: string
    namespace: string
    data?: Record<string, string>
    binaryData?: Record<string, string>
    labels?: Record<string, string>
    annotations?: Record<string, string>
    creationTimestamp?: string
}

export const createConfigMap = (config: ConfigMapConfig): ConfigMap => {
    const configMap: ConfigMap = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
            name: config.name,
            namespace: config.namespace,
            creationTimestamp: config.creationTimestamp || new Date().toISOString(),
            ...(config.labels && { labels: config.labels }),
            ...(config.annotations && { annotations: config.annotations }),
        },
        ...(config.data && { data: config.data }),
        ...(config.binaryData && { binaryData: config.binaryData }),
    }

    return deepFreeze(configMap)
}

// ─── Zod Schema for YAML Validation (internal use only) ──────────────────

const ConfigMapManifestSchema = z.object({
    apiVersion: z.literal('v1'),
    kind: z.literal('ConfigMap'),
    metadata: z.object({
        name: z.string().min(1, 'ConfigMap name is required'),
        namespace: z.string().default('default'),
        labels: z.record(z.string(), z.string()).optional(),
        annotations: z.record(z.string(), z.string()).optional(),
        creationTimestamp: z.string().optional()
    }),
    data: z.record(z.string(), z.string()).optional(),
    binaryData: z.record(z.string(), z.string()).optional()
})

/**
 * Parse and validate ConfigMap manifest from YAML
 */
export const parseConfigMapManifest = (data: unknown): Result<ConfigMap> => {
    const result = ConfigMapManifestSchema.safeParse(data)

    if (!result.success) {
        const firstError = result.error.issues[0]
        return error(`Invalid ConfigMap manifest: ${firstError.path.join('.')}: ${firstError.message}`)
    }

    const manifest = result.data

    const configMap: ConfigMap = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
            name: manifest.metadata.name,
            namespace: manifest.metadata.namespace,
            creationTimestamp: manifest.metadata.creationTimestamp || new Date().toISOString(),
            ...(manifest.metadata.labels && { labels: manifest.metadata.labels }),
            ...(manifest.metadata.annotations && { annotations: manifest.metadata.annotations })
        },
        ...(manifest.data && { data: manifest.data }),
        ...(manifest.binaryData && { binaryData: manifest.binaryData })
    }

    return success(deepFreeze(configMap))
}

