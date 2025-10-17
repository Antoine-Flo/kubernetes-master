// ═══════════════════════════════════════════════════════════════════════════
// POD MODEL (ENHANCED)
// ═══════════════════════════════════════════════════════════════════════════
// Kubernetes Pod with ADT patterns for type-safe probes, env vars, and volumes

import { deepFreeze } from '../../shared/deepFreeze'
import type { KubernetesResource } from '../repositories/types'

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

export type EnvVarSource =
    | { type: 'value'; value: string }
    | { type: 'configMapKeyRef'; name: string; key: string }
    | { type: 'secretKeyRef'; name: string; key: string }

export interface EnvVar {
    name: string
    source: EnvVarSource
}

// ─── Volumes ───────────────────────────────────────────────────────

export type VolumeSource =
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

export interface ResourceRequirements {
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

export interface ContainerPort {
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

export interface PodMetadata {
    name: string
    namespace: string
    labels?: Record<string, string>
    creationTimestamp: string
}

export interface PodSpec {
    containers: readonly Container[]
    volumes?: Volume[]
}

export interface PodStatus {
    phase: PodPhase
    restartCount: number
}

export interface Pod extends KubernetesResource {
    apiVersion: 'v1'
    kind: 'Pod'
    metadata: PodMetadata
    spec: PodSpec
    status: PodStatus
}

export interface PodConfig {
    name: string
    namespace: string
    containers: Container[]
    volumes?: Volume[]
    labels?: Record<string, string>
    creationTimestamp?: string
    phase?: PodPhase
    restartCount?: number
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
        },
        spec: {
            containers: config.containers,
            ...(config.volumes && { volumes: config.volumes }),
        },
        status: {
            phase: config.phase || 'Pending',
            restartCount: config.restartCount || 0,
        },
    }

    return deepFreeze(pod)
}

