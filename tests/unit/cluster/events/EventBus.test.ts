import { describe, expect, it, vi } from 'vitest'
import { createEventBus } from '../../../../src/cluster/events/EventBus'
import { createPodCreatedEvent, createPodDeletedEvent } from '../../../../src/cluster/events/types'
import type { Pod } from '../../../../src/cluster/ressources/Pod'

describe('EventBus', () => {
    const createMockPod = (): Pod => ({
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
            name: 'test-pod',
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

    describe('subscribe and emit', () => {
        it('should notify subscribers when event is emitted', () => {
            const eventBus = createEventBus()
            const subscriber = vi.fn()
            const pod = createMockPod()
            const event = createPodCreatedEvent(pod, 'test')

            eventBus.subscribe('PodCreated', subscriber)
            eventBus.emit(event)

            expect(subscriber).toHaveBeenCalledOnce()
            expect(subscriber).toHaveBeenCalledWith(event)
        })

        it('should notify multiple subscribers', () => {
            const eventBus = createEventBus()
            const subscriber1 = vi.fn()
            const subscriber2 = vi.fn()
            const pod = createMockPod()
            const event = createPodCreatedEvent(pod, 'test')

            eventBus.subscribe('PodCreated', subscriber1)
            eventBus.subscribe('PodCreated', subscriber2)
            eventBus.emit(event)

            expect(subscriber1).toHaveBeenCalledOnce()
            expect(subscriber2).toHaveBeenCalledOnce()
        })

        it('should only notify subscribers of matching event type', () => {
            const eventBus = createEventBus()
            const createdSubscriber = vi.fn()
            const deletedSubscriber = vi.fn()
            const pod = createMockPod()
            const createdEvent = createPodCreatedEvent(pod, 'test')

            eventBus.subscribe('PodCreated', createdSubscriber)
            eventBus.subscribe('PodDeleted', deletedSubscriber)
            eventBus.emit(createdEvent)

            expect(createdSubscriber).toHaveBeenCalledOnce()
            expect(deletedSubscriber).not.toHaveBeenCalled()
        })
    })

    describe('subscribeAll', () => {
        it('should notify all-events subscribers for any event type', () => {
            const eventBus = createEventBus()
            const allSubscriber = vi.fn()
            const pod = createMockPod()
            const createdEvent = createPodCreatedEvent(pod, 'test')
            const deletedEvent = createPodDeletedEvent('test-pod', 'default', pod, 'test')

            eventBus.subscribeAll(allSubscriber)
            eventBus.emit(createdEvent)
            eventBus.emit(deletedEvent)

            expect(allSubscriber).toHaveBeenCalledTimes(2)
            expect(allSubscriber).toHaveBeenNthCalledWith(1, createdEvent)
            expect(allSubscriber).toHaveBeenNthCalledWith(2, deletedEvent)
        })

        it('should notify both type-specific and all-events subscribers', () => {
            const eventBus = createEventBus()
            const typeSubscriber = vi.fn()
            const allSubscriber = vi.fn()
            const pod = createMockPod()
            const event = createPodCreatedEvent(pod, 'test')

            eventBus.subscribe('PodCreated', typeSubscriber)
            eventBus.subscribeAll(allSubscriber)
            eventBus.emit(event)

            expect(typeSubscriber).toHaveBeenCalledOnce()
            expect(allSubscriber).toHaveBeenCalledOnce()
        })
    })

    describe('unsubscribe', () => {
        it('should stop notifying after unsubscribe', () => {
            const eventBus = createEventBus()
            const subscriber = vi.fn()
            const pod = createMockPod()
            const event = createPodCreatedEvent(pod, 'test')

            const unsubscribe = eventBus.subscribe('PodCreated', subscriber)
            eventBus.emit(event)
            expect(subscriber).toHaveBeenCalledOnce()

            unsubscribe()
            eventBus.emit(event)
            expect(subscriber).toHaveBeenCalledOnce()
        })

        it('should stop notifying all-events subscriber after unsubscribe', () => {
            const eventBus = createEventBus()
            const subscriber = vi.fn()
            const pod = createMockPod()
            const event = createPodCreatedEvent(pod, 'test')

            const unsubscribe = eventBus.subscribeAll(subscriber)
            eventBus.emit(event)
            expect(subscriber).toHaveBeenCalledOnce()

            unsubscribe()
            eventBus.emit(event)
            expect(subscriber).toHaveBeenCalledOnce()
        })
    })

    describe('event history', () => {
        it('should store events in history when enabled', () => {
            const eventBus = createEventBus({ enableHistory: true })
            const pod = createMockPod()
            const event1 = createPodCreatedEvent(pod, 'test')
            const event2 = createPodDeletedEvent('test-pod', 'default', pod, 'test')

            eventBus.emit(event1)
            eventBus.emit(event2)

            const history = eventBus.getHistory()
            expect(history).toHaveLength(2)
            expect(history[0]).toEqual(event1)
            expect(history[1]).toEqual(event2)
        })

        it('should not store events when history is disabled', () => {
            const eventBus = createEventBus({ enableHistory: false })
            const pod = createMockPod()
            const event = createPodCreatedEvent(pod, 'test')

            eventBus.emit(event)

            const history = eventBus.getHistory()
            expect(history).toHaveLength(0)
        })

        it('should rotate history when max size is reached', () => {
            const eventBus = createEventBus({ enableHistory: true, maxHistorySize: 2 })
            const pod = createMockPod()

            eventBus.emit(createPodCreatedEvent({ ...pod, metadata: { ...pod.metadata, name: 'pod1' } }, 'test'))
            eventBus.emit(createPodCreatedEvent({ ...pod, metadata: { ...pod.metadata, name: 'pod2' } }, 'test'))
            eventBus.emit(createPodCreatedEvent({ ...pod, metadata: { ...pod.metadata, name: 'pod3' } }, 'test'))

            const history = eventBus.getHistory()
            expect(history).toHaveLength(2)
            expect(history[0].payload.pod.metadata.name).toBe('pod2')
            expect(history[1].payload.pod.metadata.name).toBe('pod3')
        })

        it('should clear history', () => {
            const eventBus = createEventBus({ enableHistory: true })
            const pod = createMockPod()
            const event = createPodCreatedEvent(pod, 'test')

            eventBus.emit(event)
            expect(eventBus.getHistory()).toHaveLength(1)

            eventBus.clearHistory()
            expect(eventBus.getHistory()).toHaveLength(0)
        })

        it('should return read-only copy of history', () => {
            const eventBus = createEventBus({ enableHistory: true })
            const pod = createMockPod()
            const event = createPodCreatedEvent(pod, 'test')

            eventBus.emit(event)
            const history1 = eventBus.getHistory()
            const history2 = eventBus.getHistory()

            expect(history1).not.toBe(history2)
            expect(history1).toEqual(history2)
        })
    })
})

