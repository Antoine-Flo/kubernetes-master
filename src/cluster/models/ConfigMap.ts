import { deepFreeze } from '../../shared/deepFreeze'
import type { KubernetesResource } from '../repositories/types'

export interface ConfigMapMetadata {
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

export interface ConfigMapConfig {
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

