import { describe, expect, it } from 'vitest'
import { createEmptyState } from '../../../../src/cluster/ClusterState'
import {
    handleConfigMapAnnotated,
    handleConfigMapCreated,
    handleConfigMapDeleted,
    handleConfigMapLabeled,
    handlePodAnnotated,
    handlePodCreated,
    handlePodDeleted,
    handlePodLabeled,
    handlePodUpdated,
    handleSecretAnnotated,
    handleSecretCreated,
    handleSecretDeleted,
    handleSecretLabeled,
} from '../../../../src/cluster/events/handlers'
import {
    createConfigMapAnnotatedEvent,
    createConfigMapCreatedEvent,
    createConfigMapDeletedEvent,
    createConfigMapLabeledEvent,
    createPodAnnotatedEvent,
    createPodCreatedEvent,
    createPodDeletedEvent,
    createPodLabeledEvent,
    createPodUpdatedEvent,
    createSecretAnnotatedEvent,
    createSecretCreatedEvent,
    createSecretDeletedEvent,
    createSecretLabeledEvent,
} from '../../../../src/cluster/events/types'
import type { ConfigMap } from '../../../../src/cluster/ressources/ConfigMap'
import type { Pod } from '../../../../src/cluster/ressources/Pod'
import type { Secret } from '../../../../src/cluster/ressources/Secret'

describe('Event Handlers', () => {
    const createMockPod = (name = 'test-pod'): Pod => ({
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
            name,
            namespace: 'default',
            creationTimestamp: new Date().toISOString(),
        },
        spec: {
            containers: [{
                name: 'nginx',
                image: 'nginx:latest',
            }],
        },
        status: {
            phase: 'Running',
            restartCount: 0,
        },
    })

    const createMockConfigMap = (name = 'test-cm'): ConfigMap => ({
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
            name,
            namespace: 'default',
            creationTimestamp: new Date().toISOString(),
        },
        data: {
            'key1': 'value1',
        },
    })

    const createMockSecret = (name = 'test-secret'): Secret => ({
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
            name,
            namespace: 'default',
            creationTimestamp: new Date().toISOString(),
        },
        type: { type: 'Opaque' },
        data: {
            'password': btoa('secret'),
        },
    })

    describe('Pod handlers', () => {
        it('should add pod to state when handling PodCreated', () => {
            const state = createEmptyState()
            const pod = createMockPod()
            const event = createPodCreatedEvent(pod, 'test')

            const newState = handlePodCreated(state, event)

            expect(newState.pods.items).toHaveLength(1)
            expect(newState.pods.items[0]).toEqual(pod)
        })

        it('should remove pod from state when handling PodDeleted', () => {
            const pod = createMockPod()
            const state = createEmptyState()
            const createEvent = createPodCreatedEvent(pod, 'test')
            const stateWithPod = handlePodCreated(state, createEvent)

            const deleteEvent = createPodDeletedEvent('test-pod', 'default', pod, 'test')
            const newState = handlePodDeleted(stateWithPod, deleteEvent)

            expect(newState.pods.items).toHaveLength(0)
        })

        it('should update pod in state when handling PodUpdated', () => {
            const pod = createMockPod()
            const state = createEmptyState()
            const createEvent = createPodCreatedEvent(pod, 'test')
            const stateWithPod = handlePodCreated(state, createEvent)

            const updatedPod = { ...pod, status: { ...pod.status, phase: 'Failed' as const } }
            const updateEvent = createPodUpdatedEvent('test-pod', 'default', updatedPod, pod, 'test')
            const newState = handlePodUpdated(stateWithPod, updateEvent)

            expect(newState.pods.items).toHaveLength(1)
            expect(newState.pods.items[0].status.phase).toBe('Failed')
        })

        it('should not modify state when deleting non-existent pod', () => {
            const state = createEmptyState()
            const pod = createMockPod()
            const deleteEvent = createPodDeletedEvent('non-existent', 'default', pod, 'test')

            const newState = handlePodDeleted(state, deleteEvent)

            expect(newState).toEqual(state)
        })
    })

    describe('ConfigMap handlers', () => {
        it('should add configmap to state when handling ConfigMapCreated', () => {
            const state = createEmptyState()
            const cm = createMockConfigMap()
            const event = createConfigMapCreatedEvent(cm, 'test')

            const newState = handleConfigMapCreated(state, event)

            expect(newState.configMaps.items).toHaveLength(1)
            expect(newState.configMaps.items[0]).toEqual(cm)
        })

        it('should remove configmap from state when handling ConfigMapDeleted', () => {
            const cm = createMockConfigMap()
            const state = createEmptyState()
            const createEvent = createConfigMapCreatedEvent(cm, 'test')
            const stateWithCM = handleConfigMapCreated(state, createEvent)

            const deleteEvent = createConfigMapDeletedEvent('test-cm', 'default', cm, 'test')
            const newState = handleConfigMapDeleted(stateWithCM, deleteEvent)

            expect(newState.configMaps.items).toHaveLength(0)
        })

        it('should not modify state when deleting non-existent configmap', () => {
            const state = createEmptyState()
            const cm = createMockConfigMap()
            const deleteEvent = createConfigMapDeletedEvent('non-existent', 'default', cm, 'test')

            const newState = handleConfigMapDeleted(state, deleteEvent)

            expect(newState).toEqual(state)
        })
    })

    describe('Secret handlers', () => {
        it('should add secret to state when handling SecretCreated', () => {
            const state = createEmptyState()
            const secret = createMockSecret()
            const event = createSecretCreatedEvent(secret, 'test')

            const newState = handleSecretCreated(state, event)

            expect(newState.secrets.items).toHaveLength(1)
            expect(newState.secrets.items[0]).toEqual(secret)
        })

        it('should remove secret from state when handling SecretDeleted', () => {
            const secret = createMockSecret()
            const state = createEmptyState()
            const createEvent = createSecretCreatedEvent(secret, 'test')
            const stateWithSecret = handleSecretCreated(state, createEvent)

            const deleteEvent = createSecretDeletedEvent('test-secret', 'default', secret, 'test')
            const newState = handleSecretDeleted(stateWithSecret, deleteEvent)

            expect(newState.secrets.items).toHaveLength(0)
        })

        it('should not modify state when deleting non-existent secret', () => {
            const state = createEmptyState()
            const secret = createMockSecret()
            const deleteEvent = createSecretDeletedEvent('non-existent', 'default', secret, 'test')

            const newState = handleSecretDeleted(state, deleteEvent)

            expect(newState).toEqual(state)
        })
    })

    describe('Handler immutability', () => {
        it('should not mutate original state', () => {
            const state = createEmptyState()
            const originalState = JSON.parse(JSON.stringify(state))
            const pod = createMockPod()
            const event = createPodCreatedEvent(pod, 'test')

            handlePodCreated(state, event)

            expect(state).toEqual(originalState)
        })
    })

    describe('Label handlers', () => {
        it('should update pod labels when handling PodLabeled', () => {
            const state = createEmptyState()
            const pod = createMockPod()
            const createEvent = createPodCreatedEvent(pod, 'test')
            const stateWithPod = handlePodCreated(state, createEvent)

            const labeledPod = {
                ...pod,
                metadata: {
                    ...pod.metadata,
                    labels: { app: 'nginx', env: 'prod' },
                },
            }

            const labelEvent = createPodLabeledEvent(
                'test-pod',
                'default',
                { app: 'nginx', env: 'prod' },
                labeledPod,
                pod,
                'test'
            )

            const newState = handlePodLabeled(stateWithPod, labelEvent)

            expect(newState.pods.items[0].metadata.labels).toEqual({ app: 'nginx', env: 'prod' })
        })

        it('should update configmap labels when handling ConfigMapLabeled', () => {
            const state = createEmptyState()
            const cm = createMockConfigMap()
            const createEvent = createConfigMapCreatedEvent(cm, 'test')
            const stateWithCM = handleConfigMapCreated(state, createEvent)

            const labeledCM = {
                ...cm,
                metadata: {
                    ...cm.metadata,
                    labels: { type: 'config' },
                },
            }

            const labelEvent = createConfigMapLabeledEvent(
                'test-cm',
                'default',
                { type: 'config' },
                labeledCM,
                cm,
                'test'
            )

            const newState = handleConfigMapLabeled(stateWithCM, labelEvent)

            expect(newState.configMaps.items[0].metadata.labels).toEqual({ type: 'config' })
        })

        it('should update secret labels when handling SecretLabeled', () => {
            const state = createEmptyState()
            const secret = createMockSecret()
            const createEvent = createSecretCreatedEvent(secret, 'test')
            const stateWithSecret = handleSecretCreated(state, createEvent)

            const labeledSecret = {
                ...secret,
                metadata: {
                    ...secret.metadata,
                    labels: { sensitive: 'true' },
                },
            }

            const labelEvent = createSecretLabeledEvent(
                'test-secret',
                'default',
                { sensitive: 'true' },
                labeledSecret,
                secret,
                'test'
            )

            const newState = handleSecretLabeled(stateWithSecret, labelEvent)

            expect(newState.secrets.items[0].metadata.labels).toEqual({ sensitive: 'true' })
        })
    })

    describe('Annotation handlers', () => {
        it('should update pod annotations when handling PodAnnotated', () => {
            const state = createEmptyState()
            const pod = createMockPod()
            const createEvent = createPodCreatedEvent(pod, 'test')
            const stateWithPod = handlePodCreated(state, createEvent)

            const annotatedPod = {
                ...pod,
                metadata: {
                    ...pod.metadata,
                    annotations: { description: 'test pod' },
                },
            }

            const annotateEvent = createPodAnnotatedEvent(
                'test-pod',
                'default',
                { description: 'test pod' },
                annotatedPod,
                pod,
                'test'
            )

            const newState = handlePodAnnotated(stateWithPod, annotateEvent)

            expect(newState.pods.items[0].metadata.annotations).toEqual({ description: 'test pod' })
        })

        it('should update configmap annotations when handling ConfigMapAnnotated', () => {
            const state = createEmptyState()
            const cm = createMockConfigMap()
            const createEvent = createConfigMapCreatedEvent(cm, 'test')
            const stateWithCM = handleConfigMapCreated(state, createEvent)

            const annotatedCM = {
                ...cm,
                metadata: {
                    ...cm.metadata,
                    annotations: { owner: 'team-a' },
                },
            }

            const annotateEvent = createConfigMapAnnotatedEvent(
                'test-cm',
                'default',
                { owner: 'team-a' },
                annotatedCM,
                cm,
                'test'
            )

            const newState = handleConfigMapAnnotated(stateWithCM, annotateEvent)

            expect(newState.configMaps.items[0].metadata.annotations).toEqual({ owner: 'team-a' })
        })

        it('should update secret annotations when handling SecretAnnotated', () => {
            const state = createEmptyState()
            const secret = createMockSecret()
            const createEvent = createSecretCreatedEvent(secret, 'test')
            const stateWithSecret = handleSecretCreated(state, createEvent)

            const annotatedSecret = {
                ...secret,
                metadata: {
                    ...secret.metadata,
                    annotations: { rotation: 'monthly' },
                },
            }

            const annotateEvent = createSecretAnnotatedEvent(
                'test-secret',
                'default',
                { rotation: 'monthly' },
                annotatedSecret,
                secret,
                'test'
            )

            const newState = handleSecretAnnotated(stateWithSecret, annotateEvent)

            expect(newState.secrets.items[0].metadata.annotations).toEqual({ rotation: 'monthly' })
        })
    })
})

