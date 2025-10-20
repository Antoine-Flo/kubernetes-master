import { describe, it, expect, beforeEach } from 'vitest'
import { handleApply } from '../../../../../src/kubectl/commands/handlers/apply'
import { createClusterState } from '../../../../../src/cluster/ClusterState'
import { createFileSystem } from '../../../../../src/filesystem/FileSystem'
import { createPod } from '../../../../../src/cluster/models/Pod'
import { createConfigMap } from '../../../../../src/cluster/models/ConfigMap'
import { createSecret } from '../../../../../src/cluster/models/Secret'
import type { ParsedCommand } from '../../../../../src/kubectl/commands/types'

describe('handleApply', () => {
    let clusterState: ReturnType<typeof createClusterState>
    let fileSystem: ReturnType<typeof createFileSystem>

    beforeEach(() => {
        clusterState = createClusterState()
        fileSystem = createFileSystem()
    })

    describe('Basic functionality', () => {
        it('should return error when filename flag is missing', () => {
            const parsed: ParsedCommand = {
                action: 'apply',
                resource: 'pods',
                flags: {}
            }

            const result = handleApply(fileSystem, clusterState, parsed)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('filename is required')
            }
        })

        it('should return error when file does not exist', () => {
            const parsed: ParsedCommand = {
                action: 'apply',
                resource: 'pods',
                flags: { f: 'nonexistent.yaml' }
            }

            const result = handleApply(fileSystem, clusterState, parsed)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not found')
            }
        })

        it('should return error when YAML is invalid', () => {
            fileSystem.createFile('invalid.yaml', 'invalid: [')

            const parsed: ParsedCommand = {
                action: 'apply',
                resource: 'pods',
                flags: { f: 'invalid.yaml' }
            }

            const result = handleApply(fileSystem, clusterState, parsed)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Error')
            }
        })
    })

    describe('Pod apply', () => {
        it('should create new Pod from YAML file', () => {
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
spec:
  containers:
    - name: nginx
      image: nginx:latest
`
            fileSystem.createFile('pod.yaml', yaml)

            const parsed: ParsedCommand = {
                action: 'apply',
                resource: 'pods',
                flags: { f: 'pod.yaml' }
            }

            const result = handleApply(fileSystem, clusterState, parsed)

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('pod/test-pod created')
            }

            // Verify pod was added to cluster
            const pods = clusterState.getPods('default')
            expect(pods).toHaveLength(1)
            expect(pods[0].metadata.name).toBe('test-pod')
        })

        it('should update existing Pod (delete and recreate)', () => {
            // Create initial pod
            const initialPod = createPod({
                name: 'test-pod',
                namespace: 'default',
                containers: [{ name: 'nginx', image: 'nginx:1.0' }]
            })
            clusterState.addPod(initialPod)

            // Apply updated pod
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
spec:
  containers:
    - name: nginx
      image: nginx:2.0
`
            fileSystem.createFile('pod.yaml', yaml)

            const parsed: ParsedCommand = {
                action: 'apply',
                resource: 'pods',
                flags: { f: 'pod.yaml' }
            }

            const result = handleApply(fileSystem, clusterState, parsed)

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('pod/test-pod configured')
            }

            // Verify pod was updated
            const pods = clusterState.getPods('default')
            expect(pods).toHaveLength(1)
            expect(pods[0].spec.containers[0].image).toBe('nginx:2.0')
        })

        it('should support --filename flag', () => {
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
    - name: nginx
      image: nginx:latest
`
            fileSystem.createFile('pod.yaml', yaml)

            const parsed: ParsedCommand = {
                action: 'apply',
                resource: 'pods',
                flags: { filename: 'pod.yaml' }
            }

            const result = handleApply(fileSystem, clusterState, parsed)

            expect(result.ok).toBe(true)
        })
    })

    describe('ConfigMap apply', () => {
        it('should create new ConfigMap from YAML file', () => {
            const yaml = `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  namespace: default
data:
  key1: value1
  key2: value2
`
            fileSystem.createFile('configmap.yaml', yaml)

            const parsed: ParsedCommand = {
                action: 'apply',
                resource: 'configmaps',
                flags: { f: 'configmap.yaml' }
            }

            const result = handleApply(fileSystem, clusterState, parsed)

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('configmap/test-config created')
            }

            // Verify configmap was added
            const configMaps = clusterState.getConfigMaps('default')
            expect(configMaps).toHaveLength(1)
            expect(configMaps[0].metadata.name).toBe('test-config')
        })

        it('should update existing ConfigMap', () => {
            // Create initial configmap
            const initialConfigMap = createConfigMap({
                name: 'test-config',
                namespace: 'default',
                data: { key1: 'value1' }
            })
            clusterState.addConfigMap(initialConfigMap)

            // Apply updated configmap
            const yaml = `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  namespace: default
data:
  key1: value1-updated
  key2: value2
`
            fileSystem.createFile('configmap.yaml', yaml)

            const parsed: ParsedCommand = {
                action: 'apply',
                resource: 'configmaps',
                flags: { f: 'configmap.yaml' }
            }

            const result = handleApply(fileSystem, clusterState, parsed)

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('configmap/test-config configured')
            }

            // Verify configmap was updated
            const configMaps = clusterState.getConfigMaps('default')
            expect(configMaps).toHaveLength(1)
            expect(configMaps[0].data?.key1).toBe('value1-updated')
        })
    })

    describe('Secret apply', () => {
        it('should create new Secret from YAML file', () => {
            const yaml = `
apiVersion: v1
kind: Secret
metadata:
  name: test-secret
  namespace: default
type: Opaque
data:
  username: YWRtaW4=
  password: cGFzc3dvcmQ=
`
            fileSystem.createFile('secret.yaml', yaml)

            const parsed: ParsedCommand = {
                action: 'apply',
                resource: 'secrets',
                flags: { f: 'secret.yaml' }
            }

            const result = handleApply(fileSystem, clusterState, parsed)

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('secret/test-secret created')
            }

            // Verify secret was added
            const secrets = clusterState.getSecrets('default')
            expect(secrets).toHaveLength(1)
            expect(secrets[0].metadata.name).toBe('test-secret')
        })

        it('should update existing Secret', () => {
            // Create initial secret
            const initialSecret = createSecret({
                name: 'test-secret',
                namespace: 'default',
                secretType: { type: 'Opaque' },
                data: { username: 'YWRtaW4=' }
            })
            clusterState.addSecret(initialSecret)

            // Apply updated secret
            const yaml = `
apiVersion: v1
kind: Secret
metadata:
  name: test-secret
  namespace: default
type: Opaque
data:
  username: YWRtaW4=
  password: cGFzc3dvcmQ=
`
            fileSystem.createFile('secret.yaml', yaml)

            const parsed: ParsedCommand = {
                action: 'apply',
                resource: 'secrets',
                flags: { f: 'secret.yaml' }
            }

            const result = handleApply(fileSystem, clusterState, parsed)

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('secret/test-secret configured')
            }

            // Verify secret was updated
            const secrets = clusterState.getSecrets('default')
            expect(secrets).toHaveLength(1)
            expect(secrets[0].data.password).toBe('cGFzc3dvcmQ=')
        })
    })

    describe('Namespace handling', () => {
        it('should default to "default" namespace when not specified in YAML', () => {
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
    - name: nginx
      image: nginx:latest
`
            fileSystem.createFile('pod.yaml', yaml)

            const parsed: ParsedCommand = {
                action: 'apply',
                resource: 'pods',
                flags: { f: 'pod.yaml' }
            }

            const result = handleApply(fileSystem, clusterState, parsed)

            expect(result.ok).toBe(true)

            const pods = clusterState.getPods('default')
            expect(pods).toHaveLength(1)
        })

        it('should respect namespace specified in YAML', () => {
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: kube-system
spec:
  containers:
    - name: nginx
      image: nginx:latest
`
            fileSystem.createFile('pod.yaml', yaml)

            const parsed: ParsedCommand = {
                action: 'apply',
                resource: 'pods',
                flags: { f: 'pod.yaml' }
            }

            const result = handleApply(fileSystem, clusterState, parsed)

            expect(result.ok).toBe(true)

            const pods = clusterState.getPods('kube-system')
            expect(pods).toHaveLength(1)
        })
    })

    describe('Path resolution', () => {
        it('should support relative paths', () => {
            fileSystem.createDirectory('manifests', false)
            fileSystem.changeDirectory('manifests')

            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
    - name: nginx
      image: nginx:latest
`
            fileSystem.createFile('pod.yaml', yaml)
            fileSystem.changeDirectory('/')

            const parsed: ParsedCommand = {
                action: 'apply',
                resource: 'pods',
                flags: { f: 'manifests/pod.yaml' }
            }

            const result = handleApply(fileSystem, clusterState, parsed)

            expect(result.ok).toBe(true)
        })

        it('should support absolute paths', () => {
            fileSystem.createDirectory('configs', false)
            fileSystem.changeDirectory('configs')

            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
    - name: nginx
      image: nginx:latest
`
            fileSystem.createFile('pod.yaml', yaml)

            const parsed: ParsedCommand = {
                action: 'apply',
                resource: 'pods',
                flags: { f: '/configs/pod.yaml' }
            }

            const result = handleApply(fileSystem, clusterState, parsed)

            expect(result.ok).toBe(true)
        })
    })
})

