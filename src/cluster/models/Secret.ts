// ═══════════════════════════════════════════════════════════════════════════
// SECRET MODEL
// ═══════════════════════════════════════════════════════════════════════════
// Kubernetes Secret with ADT for type-safe secret types
// Includes Zod schemas for YAML manifest validation

import { z } from 'zod'
import { deepFreeze } from '../../shared/deepFreeze'
import type { KubernetesResource } from '../repositories/types'
import type { Result } from '../../shared/result'
import { success, error } from '../../shared/result'

// ADT for Secret types - discriminated union prevents invalid states
export type SecretType =
    | { type: 'Opaque' }
    | { type: 'kubernetes.io/service-account-token'; serviceAccountName: string }
    | { type: 'kubernetes.io/dockerconfigjson'; dockerConfigJson: string }

export interface SecretMetadata {
    name: string
    namespace: string
    labels?: Record<string, string>
    annotations?: Record<string, string>
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
    annotations?: Record<string, string>
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
            ...(config.annotations && { annotations: config.annotations }),
        },
        type: config.secretType,
        data: config.data,
    }

    return deepFreeze(secret)
}

// ─── Zod Schema for YAML Validation ──────────────────────────────────────

export const SecretManifestSchema = z.object({
    apiVersion: z.literal('v1'),
    kind: z.literal('Secret'),
    metadata: z.object({
        name: z.string().min(1, 'Secret name is required'),
        namespace: z.string().default('default'),
        labels: z.record(z.string(), z.string()).optional(),
        annotations: z.record(z.string(), z.string()).optional(),
        creationTimestamp: z.string().optional()
    }),
    type: z.string().optional(), // Will be normalized to ADT
    data: z.record(z.string(), z.string())
})

/**
 * Parse and validate Secret manifest from YAML
 */
export const parseSecretManifest = (data: unknown): Result<Secret> => {
    const result = SecretManifestSchema.safeParse(data)

    if (!result.success) {
        const firstError = result.error.issues[0]
        return error(`Invalid Secret manifest: ${firstError.path.join('.')}: ${firstError.message}`)
    }

    const manifest = result.data

    // Normalize type to ADT format
    let secretType: SecretType
    if (!manifest.type || manifest.type === 'Opaque') {
        secretType = { type: 'Opaque' }
    } else if (manifest.type === 'kubernetes.io/service-account-token') {
        secretType = {
            type: 'kubernetes.io/service-account-token',
            serviceAccountName: manifest.metadata.name
        }
    } else if (manifest.type === 'kubernetes.io/dockerconfigjson') {
        secretType = {
            type: 'kubernetes.io/dockerconfigjson',
            dockerConfigJson: manifest.data['.dockerconfigjson'] || ''
        }
    } else {
        secretType = { type: 'Opaque' }
    }

    const secret: Secret = {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
            name: manifest.metadata.name,
            namespace: manifest.metadata.namespace,
            creationTimestamp: manifest.metadata.creationTimestamp || new Date().toISOString(),
            ...(manifest.metadata.labels && { labels: manifest.metadata.labels }),
            ...(manifest.metadata.annotations && { annotations: manifest.metadata.annotations })
        },
        type: secretType,
        data: manifest.data
    }

    return success(deepFreeze(secret))
}

