export type PodPhase = 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown'

export interface ContainerPort {
    containerPort: number
    protocol?: 'TCP' | 'UDP'
}

export interface Container {
    name: string
    image: string
    ports?: ContainerPort[]
}

export interface PodMetadata {
    name: string
    namespace: string
    labels?: Record<string, string>
    creationTimestamp: string
}

export interface PodSpec {
    containers: readonly Container[]
}

export interface PodStatus {
    phase: PodPhase
    restartCount: number
}

export interface Pod {
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
        },
        status: {
            phase: config.phase || 'Pending',
            restartCount: config.restartCount || 0,
        },
    }

    // Freeze the object to ensure immutability
    return Object.freeze({
        ...pod,
        metadata: Object.freeze({ ...pod.metadata }),
        spec: Object.freeze({
            ...pod.spec,
            containers: Object.freeze([...pod.spec.containers]),
        }),
        status: Object.freeze({ ...pod.status }),
    })
}

