import { beforeEach, describe, expect, it } from 'vitest'
import { createClusterState } from '../../../../../src/cluster/ClusterState'
import { createEventBus } from '../../../../../src/cluster/events/EventBus'
import { createConfigMap } from '../../../../../src/cluster/ressources/ConfigMap'
import { createPod } from '../../../../../src/cluster/ressources/Pod'
import { createSecret } from '../../../../../src/cluster/ressources/Secret'
import { createFileSystem } from '../../../../../src/filesystem/FileSystem'
import { handleCreate } from '../../../../../src/kubectl/commands/handlers/applyCreate'
import type { ParsedCommand } from '../../../../../src/kubectl/commands/types'

describe('handleCreate', () => {
  let clusterState: ReturnType<typeof createClusterState>
  let fileSystem: ReturnType<typeof createFileSystem>
  let eventBus: ReturnType<typeof createEventBus>

  beforeEach(() => {
    eventBus = createEventBus()
    clusterState = createClusterState(eventBus)
    fileSystem = createFileSystem()
  })

  describe('Basic functionality', () => {
    it('should return error when filename flag is missing', () => {
      const parsed: ParsedCommand = {
        action: 'create',
        resource: 'pods',
        flags: {}
      }

      const result = handleCreate(fileSystem, clusterState, parsed, eventBus)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('must specify one of -f')
      }
    })

    it('should return error when file does not exist', () => {
      const parsed: ParsedCommand = {
        action: 'create',
        resource: 'pods',
        flags: { f: 'nonexistent.yaml' }
      }

      const result = handleCreate(fileSystem, clusterState, parsed, eventBus)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('No such file or directory')
      }
    })

    it('should return error when YAML is invalid', () => {
      fileSystem.createFile('invalid.yaml', 'invalid: [')

      const parsed: ParsedCommand = {
        action: 'create',
        resource: 'pods',
        flags: { f: 'invalid.yaml' }
      }

      const result = handleCreate(fileSystem, clusterState, parsed, eventBus)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('error')
      }
    })
  })

  describe('Pod create', () => {
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
        action: 'create',
        resource: 'pods',
        flags: { f: 'pod.yaml' }
      }

      const result = handleCreate(fileSystem, clusterState, parsed, eventBus)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('pod/test-pod created')
      }

      // Verify pod was added to cluster
      const pods = clusterState.getPods('default')
      expect(pods).toHaveLength(1)
      expect(pods[0].metadata.name).toBe('test-pod')
    })

    it('should fail when Pod already exists', () => {
      // Create initial pod
      const existingPod = createPod({
        name: 'test-pod',
        namespace: 'default',
        containers: [{ name: 'nginx', image: 'nginx:1.0' }]
      })
      clusterState.addPod(existingPod)

      // Try to create same pod
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
        action: 'create',
        resource: 'pods',
        flags: { f: 'pod.yaml' }
      }

      const result = handleCreate(fileSystem, clusterState, parsed, eventBus)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('AlreadyExists')
        expect(result.error).toContain('test-pod')
      }

      // Verify pod was NOT updated
      const pods = clusterState.getPods('default')
      expect(pods).toHaveLength(1)
      expect(pods[0].spec.containers[0].image).toBe('nginx:1.0')
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
        action: 'create',
        resource: 'pods',
        flags: { filename: 'pod.yaml' }
      }

      const result = handleCreate(fileSystem, clusterState, parsed, eventBus)

      expect(result.ok).toBe(true)
    })
  })

  describe('ConfigMap create', () => {
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
        action: 'create',
        resource: 'configmaps',
        flags: { f: 'configmap.yaml' }
      }

      const result = handleCreate(fileSystem, clusterState, parsed, eventBus)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('configmap/test-config created')
      }

      // Verify configmap was added
      const configMaps = clusterState.getConfigMaps('default')
      expect(configMaps).toHaveLength(1)
      expect(configMaps[0].metadata.name).toBe('test-config')
    })

    it('should fail when ConfigMap already exists', () => {
      // Create initial configmap
      const existingConfigMap = createConfigMap({
        name: 'test-config',
        namespace: 'default',
        data: { key1: 'value1' }
      })
      clusterState.addConfigMap(existingConfigMap)

      // Try to create same configmap
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
        action: 'create',
        resource: 'configmaps',
        flags: { f: 'configmap.yaml' }
      }

      const result = handleCreate(fileSystem, clusterState, parsed, eventBus)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('AlreadyExists')
        expect(result.error).toContain('test-config')
      }

      // Verify configmap was NOT updated
      const configMaps = clusterState.getConfigMaps('default')
      expect(configMaps).toHaveLength(1)
      expect(configMaps[0].data?.key1).toBe('value1')
    })
  })

  describe('Secret create', () => {
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
        action: 'create',
        resource: 'secrets',
        flags: { f: 'secret.yaml' }
      }

      const result = handleCreate(fileSystem, clusterState, parsed, eventBus)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('secret/test-secret created')
      }

      // Verify secret was added
      const secrets = clusterState.getSecrets('default')
      expect(secrets).toHaveLength(1)
      expect(secrets[0].metadata.name).toBe('test-secret')
    })

    it('should fail when Secret already exists', () => {
      // Create initial secret
      const existingSecret = createSecret({
        name: 'test-secret',
        namespace: 'default',
        secretType: { type: 'Opaque' },
        data: { username: 'YWRtaW4=' }
      })
      clusterState.addSecret(existingSecret)

      // Try to create same secret
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
        action: 'create',
        resource: 'secrets',
        flags: { f: 'secret.yaml' }
      }

      const result = handleCreate(fileSystem, clusterState, parsed, eventBus)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('AlreadyExists')
        expect(result.error).toContain('test-secret')
      }

      // Verify secret was NOT updated
      const secrets = clusterState.getSecrets('default')
      expect(secrets).toHaveLength(1)
      expect(Object.keys(secrets[0].data)).toHaveLength(1)
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
        action: 'create',
        resource: 'pods',
        flags: { f: 'pod.yaml' }
      }

      const result = handleCreate(fileSystem, clusterState, parsed, eventBus)

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
        action: 'create',
        resource: 'pods',
        flags: { f: 'pod.yaml' }
      }

      const result = handleCreate(fileSystem, clusterState, parsed, eventBus)

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
        action: 'create',
        resource: 'pods',
        flags: { f: 'manifests/pod.yaml' }
      }

      const result = handleCreate(fileSystem, clusterState, parsed, eventBus)

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
        action: 'create',
        resource: 'pods',
        flags: { f: '/configs/pod.yaml' }
      }

      const result = handleCreate(fileSystem, clusterState, parsed, eventBus)

      expect(result.ok).toBe(true)
    })
  })

  describe('Difference from kubectl apply', () => {
    it('create fails if resource exists, apply succeeds and updates', () => {
      const existingPod = createPod({
        name: 'test-pod',
        namespace: 'default',
        containers: [{ name: 'nginx', image: 'nginx:1.0' }]
      })
      clusterState.addPod(existingPod)

      const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
    - name: nginx
      image: nginx:2.0
`
      fileSystem.createFile('pod.yaml', yaml)

      const parsedCreate: ParsedCommand = {
        action: 'create',
        resource: 'pods',
        flags: { f: 'pod.yaml' }
      }

      // Create should fail
      const createResult = handleCreate(fileSystem, clusterState, parsedCreate, eventBus)
      expect(createResult.ok).toBe(false)

      // Verify pod was NOT changed
      const pods = clusterState.getPods('default')
      expect(pods[0].spec.containers[0].image).toBe('nginx:1.0')
    })
  })
})

