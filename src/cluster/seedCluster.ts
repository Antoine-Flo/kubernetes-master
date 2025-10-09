import { createPod } from './models/Pod'
import { createClusterState } from './ClusterState'
import type { ClusterState } from './ClusterState'

export const createSeedCluster = (): ClusterState => {
    // Create seed pods with realistic data
    const pods = [
        // Default namespace pods
        createPod({
            name: 'nginx-deployment-7d8f6c9b5d-x7k2m',
            namespace: 'default',
            containers: [
                {
                    name: 'nginx',
                    image: 'nginx:1.21',
                    ports: [{ containerPort: 80 }],
                },
            ],
            labels: {
                app: 'nginx',
                tier: 'frontend',
            },
            phase: 'Running',
            restartCount: 0,
            creationTimestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        }),
        createPod({
            name: 'redis-master-0',
            namespace: 'default',
            containers: [
                {
                    name: 'redis',
                    image: 'redis:7.0-alpine',
                    ports: [{ containerPort: 6379 }],
                },
            ],
            labels: {
                app: 'redis',
                role: 'master',
            },
            phase: 'Running',
            restartCount: 1,
            creationTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        }),
        createPod({
            name: 'postgres-db-6c8f9d7b4a-h9m3p',
            namespace: 'default',
            containers: [
                {
                    name: 'postgres',
                    image: 'postgres:14-alpine',
                    ports: [{ containerPort: 5432 }],
                },
            ],
            labels: {
                app: 'postgres',
                tier: 'database',
            },
            phase: 'Running',
            restartCount: 0,
            creationTimestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        }),
        // Kube-system namespace pods
        createPod({
            name: 'coredns-7d89d9b6f8-2xk9w',
            namespace: 'kube-system',
            containers: [
                {
                    name: 'coredns',
                    image: 'coredns/coredns:1.10.1',
                    ports: [
                        { containerPort: 53, protocol: 'UDP' },
                        { containerPort: 53, protocol: 'TCP' },
                    ],
                },
            ],
            labels: {
                'k8s-app': 'kube-dns',
            },
            phase: 'Running',
            restartCount: 0,
            creationTimestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        }),
    ]

    // Create cluster state and add all pods
    const clusterState = createClusterState()
    pods.forEach((pod) => clusterState.addPod(pod))

    return clusterState
}

