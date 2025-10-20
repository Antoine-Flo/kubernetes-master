import { describe, it, expect } from 'vitest'
import { parseKubernetesYaml } from '../../../src/kubectl/yamlParser'

describe('yamlParser', () => {
    describe('parseKubernetesYaml - Valid YAML', () => {
        it('should parse valid Pod YAML', () => {
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
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.kind).toBe('Pod')
                expect(result.value.metadata.name).toBe('test-pod')
                expect(result.value.metadata.namespace).toBe('default')
            }
        })

        it('should parse valid ConfigMap YAML', () => {
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
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.kind).toBe('ConfigMap')
                expect(result.value.metadata.name).toBe('test-config')
            }
        })

        it('should parse valid Secret YAML', () => {
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
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.kind).toBe('Secret')
                expect(result.value.metadata.name).toBe('test-secret')
            }
        })

        it('should default namespace to "default" when not specified', () => {
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
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.metadata.namespace).toBe('default')
            }
        })

        it('should parse Pod with labels and annotations', () => {
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: labeled-pod
  labels:
    app: nginx
    tier: frontend
  annotations:
    description: Test pod
spec:
  containers:
    - name: nginx
      image: nginx:latest
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.metadata.labels).toEqual({
                    app: 'nginx',
                    tier: 'frontend'
                })
                expect(result.value.metadata.annotations).toEqual({
                    description: 'Test pod'
                })
            }
        })

        it('should parse Pod with multiple containers', () => {
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-pod
spec:
  containers:
    - name: nginx
      image: nginx:latest
    - name: redis
      image: redis:latest
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(true)
            if (result.ok && result.value.kind === 'Pod') {
                expect(result.value.spec.containers).toHaveLength(2)
                expect(result.value.spec.containers[0].name).toBe('nginx')
                expect(result.value.spec.containers[1].name).toBe('redis')
            }
        })

        it('should parse ConfigMap without data field', () => {
            const yaml = `
apiVersion: v1
kind: ConfigMap
metadata:
  name: empty-config
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.kind).toBe('ConfigMap')
            }
        })

        it('should normalize Secret type to ADT format', () => {
            const yaml = `
apiVersion: v1
kind: Secret
metadata:
  name: test-secret
type: Opaque
data:
  key: dmFsdWU=
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(true)
            if (result.ok && result.value.kind === 'Secret') {
                expect(result.value.type).toEqual({ type: 'Opaque' })
            }
        })
    })

    describe('parseKubernetesYaml - Invalid YAML', () => {
        it('should fail on malformed YAML syntax', () => {
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  invalid: [
spec:
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('YAML parse error')
            }
        })

        it('should fail on empty YAML', () => {
            const yaml = ''
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('empty or invalid')
            }
        })

        it('should fail when apiVersion is missing', () => {
            const yaml = `
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
    - name: nginx
      image: nginx:latest
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('apiVersion')
            }
        })

        it('should fail when kind is missing', () => {
            const yaml = `
apiVersion: v1
metadata:
  name: test-pod
spec:
  containers:
    - name: nginx
      image: nginx:latest
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('kind')
            }
        })

        it('should fail when metadata is missing', () => {
            const yaml = `
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: nginx
      image: nginx:latest
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('metadata')
            }
        })

        it('should fail when metadata.name is missing', () => {
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  namespace: default
spec:
  containers:
    - name: nginx
      image: nginx:latest
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('metadata.name')
            }
        })

        it('should fail on unsupported kind', () => {
            const yaml = `
apiVersion: v1
kind: Deployment
metadata:
  name: test-deployment
spec:
  replicas: 3
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Unsupported resource kind')
                expect(result.error).toContain('Deployment')
            }
        })
    })

    describe('parseKubernetesYaml - Pod-specific validation', () => {
        it('should fail when Pod has invalid apiVersion', () => {
            const yaml = `
apiVersion: apps/v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
    - name: nginx
      image: nginx:latest
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('apiVersion')
                expect(result.error).toContain('v1')
            }
        })

        it('should fail when Pod spec is missing', () => {
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('spec')
            }
        })

        it('should fail when Pod containers array is missing', () => {
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  restartPolicy: Always
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('containers')
            }
        })

        it('should fail when Pod containers array is empty', () => {
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers: []
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('containers')
            }
        })

        it('should fail when container is missing name', () => {
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
    - image: nginx:latest
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('name')
            }
        })

        it('should fail when container is missing image', () => {
            const yaml = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
    - name: nginx
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('image')
            }
        })
    })

    describe('parseKubernetesYaml - ConfigMap-specific validation', () => {
        it('should fail when ConfigMap has invalid apiVersion', () => {
            const yaml = `
apiVersion: apps/v1
kind: ConfigMap
metadata:
  name: test-config
data:
  key: value
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('apiVersion')
            }
        })

        it('should fail when ConfigMap data is not an object', () => {
            const yaml = `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
data: "invalid"
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('data')
            }
        })
    })

    describe('parseKubernetesYaml - Secret-specific validation', () => {
        it('should fail when Secret has invalid apiVersion', () => {
            const yaml = `
apiVersion: apps/v1
kind: Secret
metadata:
  name: test-secret
data:
  key: dmFsdWU=
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('apiVersion')
            }
        })

        it('should fail when Secret data is missing', () => {
            const yaml = `
apiVersion: v1
kind: Secret
metadata:
  name: test-secret
type: Opaque
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('data')
            }
        })

        it('should fail when Secret data is not an object', () => {
            const yaml = `
apiVersion: v1
kind: Secret
metadata:
  name: test-secret
data: "invalid"
`
            const result = parseKubernetesYaml(yaml)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('data')
            }
        })
    })
})

