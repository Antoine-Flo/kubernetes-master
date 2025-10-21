import { describe, expect, it } from 'vitest'
import { createEmptyState } from '../../../../src/cluster/ClusterState'
import {
    handleConfigMapCreated,
    handleConfigMapDeleted,
    handlePodCreated,
    handlePodDeleted,
    handlePodUpdated,
    handleSecretCreated,
    handleSecretDeleted,
} from '../../../../src/cluster/events/handlers'
import {
    createConfigMapCreatedEvent,
    createConfigMapDeletedEvent,
    createPodCreatedEvent,
    createPodDeletedEvent,
    createPodUpdatedEvent,
    createSecretCreatedEvent,
    createSecretDeletedEvent,
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
            conditions: [],
            containerStatuses: [],
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
        type: 'Opaque',
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
})

