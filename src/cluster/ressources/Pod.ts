// ═══════════════════════════════════════════════════════════════════════════
// POD MODEL (ENHANCED)
// ═══════════════════════════════════════════════════════════════════════════
// Kubernetes Pod with ADT patterns for type-safe probes, env vars, and volumes
// Includes Zod schemas for YAML manifest validation

import { z } from 'zod'
import { deepFreeze } from '../../shared/deepFreeze'
import type { KubernetesResource } from '../repositories/types'
import type { Result } from '../../shared/result'
import { success, error } from '../../shared/result'

export type PodPhase = 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown'

// ─── Probes ────────────────────────────────────────────────────────

export type Probe =
    | {
        type: 'httpGet'
        path: string
        port: number
        initialDelaySeconds?: number
        periodSeconds?: number
    }
    | {
        type: 'exec'
        command: string[]
        initialDelaySeconds?: number
        periodSeconds?: number
    }
    | {
        type: 'tcpSocket'
        port: number
        initialDelaySeconds?: number
        periodSeconds?: number
    }

// ─── Environment Variables ─────────────────────────────────────────

type EnvVarSource =
    | { type: 'value'; value: string }
    | { type: 'configMapKeyRef'; name: string; key: string }
    | { type: 'secretKeyRef'; name: string; key: string }

export interface EnvVar {
    name: string
    source: EnvVarSource
}

// ─── Volumes ───────────────────────────────────────────────────────

type VolumeSource =
    | { type: 'emptyDir' }
    | { type: 'configMap'; name: string }
    | { type: 'secret'; secretName: string }

export interface Volume {
    name: string
    source: VolumeSource
}

export interface VolumeMount {
    name: string
    mountPath: string
    readOnly?: boolean
}

// ─── Resource Requirements ───────────────────────────────────────────────

interface ResourceRequirements {
    requests?: {
        cpu?: string
        memory?: string
    }
    limits?: {
        cpu?: string
        memory?: string
    }
}

// ─── Container ───────────────────────────────────────────────────────────

interface ContainerPort {
    containerPort: number
    protocol?: 'TCP' | 'UDP'
}

export interface Container {
    name: string
    image: string
    ports?: ContainerPort[]
    resources?: ResourceRequirements
    env?: EnvVar[]
    volumeMounts?: VolumeMount[]
    livenessProbe?: Probe
    readinessProbe?: Probe
    startupProbe?: Probe
}

// ─── Pod Structure ───────────────────────────────────────────────────────

interface PodMetadata {
    name: string
    namespace: string
    labels?: Record<string, string>
    annotations?: Record<string, string>
    creationTimestamp: string
}

interface PodSpec {
    containers: readonly Container[]
    volumes?: Volume[]
}

interface PodStatus {
    phase: PodPhase
    restartCount: number
    logs?: string[]
}

export interface Pod extends KubernetesResource {
    apiVersion: 'v1'
    kind: 'Pod'
    metadata: PodMetadata
    spec: PodSpec
    status: PodStatus
}

interface PodConfig {
    name: string
    namespace: string
    containers: Container[]
    volumes?: Volume[]
    labels?: Record<string, string>
    annotations?: Record<string, string>
    creationTimestamp?: string
    phase?: PodPhase
    restartCount?: number
    logs?: string[]
}

export const createPod = (config: PodConfig): Pod => {
    const pod: Pod = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
            name: config.name,
            namespace: config.namespace,
            creationTimestamp: config.creationTimestamp || new Date().toISOString(),
            ...(config.labels && { labels: config.labels }),
            ...(config.annotations && { annotations: config.annotations }),
        },
        spec: {
            containers: config.containers,
            ...(config.volumes && { volumes: config.volumes }),
        },
        status: {
            phase: config.phase || 'Pending',
            restartCount: config.restartCount || 0,
            ...(config.logs && { logs: config.logs }),
        },
    }

    return deepFreeze(pod)
}

// ─── Zod Schemas for YAML Validation (internal use only) ────────────────

const ContainerSchema = z.object({
    name: z.string().min(1, 'Container name is required'),
    image: z.string().min(1, 'Container image is required'),
    ports: z.array(z.object({
        containerPort: z.number().int().positive(),
        protocol: z.enum(['TCP', 'UDP']).optional()
    })).optional(),
    resources: z.object({
        requests: z.object({
            cpu: z.string(),
            memory: z.string()
        }).optional(),
        limits: z.object({
            cpu: z.string(),
            memory: z.string()
        }).optional()
    }).optional(),
    env: z.array(z.any()).optional(),
    volumeMounts: z.array(z.any()).optional(),
    livenessProbe: z.any().optional(),
    readinessProbe: z.any().optional(),
    startupProbe: z.any().optional()
})

const PodManifestSchema = z.object({
    apiVersion: z.literal('v1'),
    kind: z.literal('Pod'),
    metadata: z.object({
        name: z.string().min(1, 'Pod name is required'),
        namespace: z.string().default('default'),
        labels: z.record(z.string(), z.string()).optional(),
        annotations: z.record(z.string(), z.string()).optional(),
        creationTimestamp: z.string().optional()
    }),
    spec: z.object({
        containers: z.array(ContainerSchema).min(1, 'At least one container is required'),
        volumes: z.array(z.any()).optional()
    }),
    status: z.object({
        phase: z.enum(['Pending', 'Running', 'Succeeded', 'Failed', 'Unknown']).optional(),
        restartCount: z.number().optional()
    }).optional()
})

/**
 * Parse and validate Pod manifest from YAML
 */
export const parsePodManifest = (data: unknown): Result<Pod> => {
    const result = PodManifestSchema.safeParse(data)

    if (!result.success) {
        const firstError = result.error.issues[0]
        return error(`Invalid Pod manifest: ${firstError.path.join('.')}: ${firstError.message}`)
    }

    const manifest = result.data

    // Create Pod with proper defaults
    const pod: Pod = {
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
            name: manifest.metadata.name,
            namespace: manifest.metadata.namespace,
            creationTimestamp: manifest.metadata.creationTimestamp || new Date().toISOString(),
            ...(manifest.metadata.labels && { labels: manifest.metadata.labels }),
            ...(manifest.metadata.annotations && { annotations: manifest.metadata.annotations })
        },
        spec: {
            containers: manifest.spec.containers as Container[],
            ...(manifest.spec.volumes && { volumes: manifest.spec.volumes as Volume[] })
        },
        status: {
            phase: manifest.status?.phase || 'Pending',
            restartCount: manifest.status?.restartCount || 0
        }
    }

    return success(deepFreeze(pod))
}

