// ═══════════════════════════════════════════════════════════════════════════
// SECRET MODEL
// ═══════════════════════════════════════════════════════════════════════════
// Kubernetes Secret with ADT for type-safe secret types

import { deepFreeze } from '../../shared/deepFreeze'
import type { KubernetesResource } from '../repositories/types'

// ADT for Secret types - discriminated union prevents invalid states
export type SecretType =
    | { type: 'Opaque' }
    | { type: 'kubernetes.io/service-account-token'; serviceAccountName: string }
    | { type: 'kubernetes.io/dockerconfigjson'; dockerConfigJson: string }

export interface SecretMetadata {
    name: string
    namespace: string
    labels?: Record<string, string>
    creationTimestamp: string
}

export interface Secret extends KubernetesResource {
    apiVersion: 'v1'
    kind: 'Secret'
    metadata: SecretMetadata
    type: SecretType
    data: Record<string, string>
}

export interface SecretConfig {
    name: string
    namespace: string
    secretType: SecretType
    data: Record<string, string>
    labels?: Record<string, string>
    creationTimestamp?: string
}

export const encodeBase64 = (str: string): string => {
    if (str === '') {
        return ''
    }
    const bytes = new TextEncoder().encode(str)
    const binString = String.fromCodePoint(...bytes)
    return btoa(binString)
}

export const decodeBase64 = (base64: string): string => {
    if (base64 === '') {
        return ''
    }
    const binString = atob(base64)
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!)
    return new TextDecoder().decode(bytes)
}

export const createSecret = (config: SecretConfig): Secret => {
    const secret: Secret = {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
            name: config.name,
            namespace: config.namespace,
            creationTimestamp: config.creationTimestamp || new Date().toISOString(),
            ...(config.labels && { labels: config.labels }),
        },
        type: config.secretType,
        data: config.data,
    }

    return deepFreeze(secret)
}

