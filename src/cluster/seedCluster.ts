import { createPod } from './ressources/Pod'
import { createConfigMap } from './ressources/ConfigMap'
import { createSecret } from './ressources/Secret'
import { encodeBase64 } from './ressources/Secret'
import { createClusterState } from './ClusterState'
import type { ClusterState } from './ClusterState'

export const createSeedCluster = (): ClusterState => {
    // Create seed ConfigMaps
    const configMaps = [
        createConfigMap({
            name: 'app-config',
            namespace: 'default',
            labels: {
                app: 'web',
            },
            data: {
                'database.host': 'postgres.default.svc.cluster.local',
                'database.port': '5432',
                'log.level': 'info',
                'app.properties': 'server.port=8080\nserver.host=0.0.0.0',
            },
            creationTimestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        }),
        createConfigMap({
            name: 'nginx-config',
            namespace: 'default',
            labels: {
                app: 'nginx',
            },
            data: {
                'nginx.conf': 'worker_processes auto;\nevents {\n  worker_connections 1024;\n}',
            },
            creationTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        }),
    ]

    // Create seed Secrets
    const secrets = [
        createSecret({
            name: 'db-credentials',
            namespace: 'default',
            secretType: { type: 'Opaque' },
            labels: {
                app: 'database',
            },
            data: {
                username: encodeBase64('admin'),
                password: encodeBase64('supersecret123'),
            },
            creationTimestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        }),
        createSecret({
            name: 'api-token',
            namespace: 'default',
            secretType: { type: 'Opaque' },
            data: {
                token: encodeBase64('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'),
            },
            creationTimestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
        }),
    ]

    // Create seed pods with realistic data
    const pods = [
        // Pod with resource limits and probes
        createPod({
            name: 'nginx-deployment-7d8f6c9b5d-x7k2m',
            namespace: 'default',
            containers: [
                {
                    name: 'nginx',
                    image: 'nginx:1.21',
                    ports: [{ containerPort: 80 }],
                    resources: {
                        requests: {
                            cpu: '100m',
                            memory: '128Mi',
                        },
                        limits: {
                            cpu: '500m',
                            memory: '256Mi',
                        },
                    },
                    livenessProbe: {
                        type: 'httpGet',
                        path: '/healthz',
                        port: 80,
                        initialDelaySeconds: 10,
                        periodSeconds: 5,
                    },
                    readinessProbe: {
                        type: 'httpGet',
                        path: '/ready',
                        port: 80,
                        initialDelaySeconds: 5,
                        periodSeconds: 3,
                    },
                    volumeMounts: [
                        {
                            name: 'nginx-config',
                            mountPath: '/etc/nginx/nginx.conf',
                            readOnly: true,
                        },
                    ],
                },
            ],
            volumes: [
                {
                    name: 'nginx-config',
                    source: { type: 'configMap', name: 'nginx-config' },
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
        // Pod with env vars from ConfigMap and Secret
        createPod({
            name: 'postgres-db-6c8f9d7b4a-h9m3p',
            namespace: 'default',
            containers: [
                {
                    name: 'postgres',
                    image: 'postgres:14-alpine',
                    ports: [{ containerPort: 5432 }],
                    resources: {
                        requests: {
                            cpu: '250m',
                            memory: '512Mi',
                        },
                        limits: {
                            cpu: '1000m',
                            memory: '1Gi',
                        },
                    },
                    env: [
                        {
                            name: 'POSTGRES_USER',
                            source: {
                                type: 'secretKeyRef',
                                name: 'db-credentials',
                                key: 'username',
                            },
                        },
                        {
                            name: 'POSTGRES_PASSWORD',
                            source: {
                                type: 'secretKeyRef',
                                name: 'db-credentials',
                                key: 'password',
                            },
                        },
                        {
                            name: 'POSTGRES_HOST',
                            source: {
                                type: 'configMapKeyRef',
                                name: 'app-config',
                                key: 'database.host',
                            },
                        },
                    ],
                    livenessProbe: {
                        type: 'tcpSocket',
                        port: 5432,
                        initialDelaySeconds: 30,
                        periodSeconds: 10,
                    },
                    readinessProbe: {
                        type: 'exec',
                        command: ['pg_isready', '-U', 'postgres'],
                        initialDelaySeconds: 10,
                        periodSeconds: 5,
                    },
                    volumeMounts: [
                        {
                            name: 'data',
                            mountPath: '/var/lib/postgresql/data',
                        },
                    ],
                },
            ],
            volumes: [
                {
                    name: 'data',
                    source: { type: 'emptyDir' },
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

    // Create cluster state and add all resources
    const clusterState = createClusterState()

    // Add ConfigMaps
    configMaps.forEach((cm) => clusterState.addConfigMap(cm))

    // Add Secrets
    secrets.forEach((secret) => clusterState.addSecret(secret))

    // Add Pods
    pods.forEach((pod) => clusterState.addPod(pod))

    return clusterState
}

