import { describe, expect, it } from 'vitest'
import { createClusterState } from '../../../../src/cluster/ClusterState'
import { createEventBus } from '../../../../src/cluster/events/EventBus'
import { and, byNamespace, byResourceKind, bySource, byTypes } from '../../../../src/cluster/events/filters'
import { createPodAnnotatedEvent, createPodCreatedEvent, createPodLabeledEvent } from '../../../../src/cluster/events/types'
import type { Pod } from '../../../../src/cluster/ressources/Pod'

// ═══════════════════════════════════════════════════════════════════════════
// EVENT SYSTEM INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════
// Tests the complete event-driven architecture end-to-end

describe('Event System Integration', () => {
    const createTestPod = (name = 'test-pod'): Pod => ({
        apiVersion: 'v1',
        kind: 'Pod',
        metadata: {
            name,
            namespace: 'default',
            labels: {},
            creationTimestamp: new Date().toISOString(),
        },
        spec: {
            containers: [
                {
                    name: 'nginx',
                    image: 'nginx:1.14.2',
                },
            ],
        },
        status: {
            phase: 'Running',
            restartCount: 0,
        },
    })

    describe('EventBus + ClusterState Integration', () => {
        it('should update cluster state when PodCreated event is emitted', () => {
            const eventBus = createEventBus()
            const cluster = createClusterState(undefined, eventBus)

            const pod = createTestPod()
            const event = createPodCreatedEvent(pod, 'test')

            eventBus.emit(event)

            const pods = cluster.getPods()
            expect(pods).toHaveLength(1)
            expect(pods[0].metadata.name).toBe('test-pod')
        })

        it('should track all events in history', () => {
            const eventBus = createEventBus({ enableHistory: true, maxHistorySize: 100 })
            createClusterState(undefined, eventBus)

            const pod1 = createTestPod('pod-1')
            const pod2 = createTestPod('pod-2')

            eventBus.emit(createPodCreatedEvent(pod1, 'test'))
            eventBus.emit(createPodCreatedEvent(pod2, 'test'))

            const history = eventBus.getHistory()
            expect(history).toHaveLength(2)
            expect(history[0].type).toBe('PodCreated')
            expect(history[1].type).toBe('PodCreated')
        })

        it('should handle multiple subscribers for the same event', () => {
            const eventBus = createEventBus()
            const cluster = createClusterState(undefined, eventBus)

            let subscriberCallCount = 0
            eventBus.subscribe('PodCreated', () => {
                subscriberCallCount++
            })

            const pod = createTestPod()
            eventBus.emit(createPodCreatedEvent(pod, 'test'))

            expect(subscriberCallCount).toBe(1)
            expect(cluster.getPods()).toHaveLength(1)
        })
    })

    describe('Label and Annotate Events', () => {
        it('should handle PodLabeled event', () => {
            const eventBus = createEventBus()
            const cluster = createClusterState(undefined, eventBus)

            const pod = createTestPod()
            eventBus.emit(createPodCreatedEvent(pod, 'test'))

            const labeledPod = {
                ...pod,
                metadata: {
                    ...pod.metadata,
                    labels: { app: 'nginx', env: 'prod' },
                },
            }

            eventBus.emit(createPodLabeledEvent(
                'test-pod',
                'default',
                { app: 'nginx', env: 'prod' },
                labeledPod,
                pod,
                'test'
            ))

            const pods = cluster.getPods()
            expect(pods[0].metadata.labels).toEqual({ app: 'nginx', env: 'prod' })
        })

        it('should handle PodAnnotated event', () => {
            const eventBus = createEventBus()
            const cluster = createClusterState(undefined, eventBus)

            const pod = createTestPod()
            eventBus.emit(createPodCreatedEvent(pod, 'test'))

            const annotatedPod = {
                ...pod,
                metadata: {
                    ...pod.metadata,
                    annotations: { 'description': 'test pod' },
                },
            }

            eventBus.emit(createPodAnnotatedEvent(
                'test-pod',
                'default',
                { 'description': 'test pod' },
                annotatedPod,
                pod,
                'test'
            ))

            const pods = cluster.getPods()
            expect(pods[0].metadata.annotations).toEqual({ 'description': 'test pod' })
        })

        it('should track label and annotate events in history', () => {
            const eventBus = createEventBus({ enableHistory: true })
            createClusterState(undefined, eventBus)

            const pod = createTestPod()
            eventBus.emit(createPodCreatedEvent(pod, 'test'))

            const labeledPod = {
                ...pod,
                metadata: { ...pod.metadata, labels: { app: 'test' } },
            }
            eventBus.emit(createPodLabeledEvent('test-pod', 'default', { app: 'test' }, labeledPod, pod, 'test'))

            const annotatedPod = {
                ...labeledPod,
                metadata: { ...labeledPod.metadata, annotations: { note: 'test' } },
            }
            eventBus.emit(createPodAnnotatedEvent('test-pod', 'default', { note: 'test' }, annotatedPod, labeledPod, 'test'))

            const history = eventBus.getHistory()
            expect(history).toHaveLength(3)
            expect(history[0].type).toBe('PodCreated')
            expect(history[1].type).toBe('PodLabeled')
            expect(history[2].type).toBe('PodAnnotated')
        })
    })

    describe('Centralized Logging', () => {
        it('should log all events via subscribeAll', () => {
            const eventBus = createEventBus()
            createClusterState(undefined, eventBus)

            const loggedEvents: string[] = []
            eventBus.subscribeAll((event) => {
                loggedEvents.push(`${event.type}:${JSON.stringify(event.payload)}`)
            })

            const pod = createTestPod()
            eventBus.emit(createPodCreatedEvent(pod, 'test'))

            expect(loggedEvents).toHaveLength(1)
            expect(loggedEvents[0]).toContain('PodCreated')
        })

        it('should log events from multiple sources', () => {
            const eventBus = createEventBus()
            createClusterState(undefined, eventBus)

            const loggedEvents: Array<{ type: string; source: string }> = []
            eventBus.subscribeAll((event) => {
                loggedEvents.push({
                    type: event.type,
                    source: event.metadata?.source || 'unknown',
                })
            })

            const pod1 = createTestPod('pod-1')
            const pod2 = createTestPod('pod-2')

            eventBus.emit(createPodCreatedEvent(pod1, 'kubectl'))
            eventBus.emit(createPodCreatedEvent(pod2, 'api'))

            expect(loggedEvents).toHaveLength(2)
            expect(loggedEvents[0].source).toBe('kubectl')
            expect(loggedEvents[1].source).toBe('api')
        })
    })

    describe('Backward Compatibility', () => {
        it('should work without EventBus (legacy mode)', () => {
            const cluster = createClusterState()

            cluster.addPod(createTestPod())

            const pods = cluster.getPods()
            expect(pods).toHaveLength(1)
        })

        it('should support direct mutations alongside events', () => {
            const eventBus = createEventBus()
            const cluster = createClusterState(undefined, eventBus)

            // Add pod via event
            const pod1 = createTestPod('pod-1')
            eventBus.emit(createPodCreatedEvent(pod1, 'test'))

            // Add pod via direct mutation
            const pod2 = createTestPod('pod-2')
            cluster.addPod(pod2)

            const pods = cluster.getPods()
            expect(pods).toHaveLength(2)
        })
    })

    describe('Event Ordering and Consistency', () => {
        it('should process events in order', () => {
            const eventBus = createEventBus()
            createClusterState(undefined, eventBus)

            const processOrder: string[] = []
            eventBus.subscribeAll((event) => {
                processOrder.push(event.type)
            })

            const pod = createTestPod()
            eventBus.emit(createPodCreatedEvent(pod, 'test'))

            const labeledPod = {
                ...pod,
                metadata: { ...pod.metadata, labels: { app: 'test' } },
            }
            eventBus.emit(createPodLabeledEvent('test-pod', 'default', { app: 'test' }, labeledPod, pod, 'test'))

            expect(processOrder).toEqual(['PodCreated', 'PodLabeled'])
        })

        it('should maintain state consistency across multiple events', () => {
            const eventBus = createEventBus()
            const cluster = createClusterState(undefined, eventBus)

            const pod = createTestPod()
            eventBus.emit(createPodCreatedEvent(pod, 'test'))

            expect(cluster.getPods()).toHaveLength(1)

            const labeledPod = {
                ...pod,
                metadata: { ...pod.metadata, labels: { version: 'v1' } },
            }
            eventBus.emit(createPodLabeledEvent('test-pod', 'default', { version: 'v1' }, labeledPod, pod, 'test'))

            const pods = cluster.getPods()
            expect(pods).toHaveLength(1)
            expect(pods[0].metadata.labels).toEqual({ version: 'v1' })
        })
    })

    describe('Event History Features', () => {
        it('should limit history size with FIFO rotation', () => {
            const eventBus = createEventBus({ enableHistory: true, maxHistorySize: 3 })
            createClusterState(undefined, eventBus)

            for (let i = 1; i <= 5; i++) {
                const pod = createTestPod(`pod-${i}`)
                eventBus.emit(createPodCreatedEvent(pod, 'test'))
            }

            const history = eventBus.getHistory()
            expect(history).toHaveLength(3)
            expect((history[0].payload as any).pod.metadata.name).toBe('pod-3')
            expect((history[2].payload as any).pod.metadata.name).toBe('pod-5')
        })

        it('should clear history when requested', () => {
            const eventBus = createEventBus({ enableHistory: true })
            createClusterState(undefined, eventBus)

            const pod = createTestPod()
            eventBus.emit(createPodCreatedEvent(pod, 'test'))

            expect(eventBus.getHistory()).toHaveLength(1)

            eventBus.clearHistory()

            expect(eventBus.getHistory()).toHaveLength(0)
        })

        it('should provide read-only history copy', () => {
            const eventBus = createEventBus({ enableHistory: true })
            createClusterState(undefined, eventBus)

            const pod = createTestPod()
            eventBus.emit(createPodCreatedEvent(pod, 'test'))

            const history1 = eventBus.getHistory()
            const history2 = eventBus.getHistory()

            expect(history1).not.toBe(history2)
            expect(history1).toEqual(history2)
        })
    })

    describe('Event Filtering', () => {
        it('should filter events by namespace', () => {
            const eventBus = createEventBus()
            createClusterState(undefined, eventBus)

            const filteredEvents: string[] = []
            eventBus.subscribeFiltered(byNamespace('production'), (event) => {
                filteredEvents.push(event.type)
            })

            const pod1 = { ...createTestPod('pod-1'), metadata: { ...createTestPod('pod-1').metadata, namespace: 'production' } }
            const pod2 = { ...createTestPod('pod-2'), metadata: { ...createTestPod('pod-2').metadata, namespace: 'development' } }

            eventBus.emit(createPodCreatedEvent(pod1, 'test'))
            eventBus.emit(createPodCreatedEvent(pod2, 'test'))

            expect(filteredEvents).toHaveLength(1)
            expect(filteredEvents[0]).toBe('PodCreated')
        })

        it('should filter events by type', () => {
            const eventBus = createEventBus()
            createClusterState(undefined, eventBus)

            const filteredEvents: string[] = []
            eventBus.subscribeFiltered(byTypes('PodCreated', 'PodLabeled'), (event) => {
                filteredEvents.push(event.type)
            })

            const pod = createTestPod()
            eventBus.emit(createPodCreatedEvent(pod, 'test'))

            const labeledPod = {
                ...pod,
                metadata: { ...pod.metadata, labels: { app: 'test' } },
            }
            eventBus.emit(createPodLabeledEvent('test-pod', 'default', { app: 'test' }, labeledPod, pod, 'test'))
            eventBus.emit(createPodAnnotatedEvent('test-pod', 'default', { note: 'test' }, labeledPod, pod, 'test'))

            expect(filteredEvents).toHaveLength(2)
            expect(filteredEvents).toEqual(['PodCreated', 'PodLabeled'])
        })

        it('should filter events by source', () => {
            const eventBus = createEventBus()
            createClusterState(undefined, eventBus)

            const filteredEvents: string[] = []
            eventBus.subscribeFiltered(bySource('kubectl'), (event) => {
                filteredEvents.push(event.type)
            })

            const pod1 = createTestPod('pod-1')
            const pod2 = createTestPod('pod-2')

            eventBus.emit(createPodCreatedEvent(pod1, 'kubectl'))
            eventBus.emit(createPodCreatedEvent(pod2, 'api'))

            expect(filteredEvents).toHaveLength(1)
        })

        it('should filter events by resource kind', () => {
            const eventBus = createEventBus()
            createClusterState(undefined, eventBus)

            const filteredEvents: string[] = []
            eventBus.subscribeFiltered(byResourceKind('Pod'), (event) => {
                filteredEvents.push(event.type)
            })

            const pod = createTestPod()
            eventBus.emit(createPodCreatedEvent(pod, 'test'))

            const labeledPod = {
                ...pod,
                metadata: { ...pod.metadata, labels: { app: 'test' } },
            }
            eventBus.emit(createPodLabeledEvent('test-pod', 'default', { app: 'test' }, labeledPod, pod, 'test'))

            expect(filteredEvents).toHaveLength(2)
            expect(filteredEvents).toEqual(['PodCreated', 'PodLabeled'])
        })

        it('should combine filters with AND logic', () => {
            const eventBus = createEventBus()
            createClusterState(undefined, eventBus)

            const filteredEvents: string[] = []
            eventBus.subscribeFiltered(
                and(byResourceKind('Pod'), bySource('kubectl')),
                (event) => {
                    filteredEvents.push(event.type)
                }
            )

            const pod1 = createTestPod('pod-1')
            const pod2 = createTestPod('pod-2')

            eventBus.emit(createPodCreatedEvent(pod1, 'kubectl'))
            eventBus.emit(createPodCreatedEvent(pod2, 'api'))

            expect(filteredEvents).toHaveLength(1)
        })

        it('should retrieve filtered history', () => {
            const eventBus = createEventBus({ enableHistory: true })
            createClusterState(undefined, eventBus)

            const pod = createTestPod()
            eventBus.emit(createPodCreatedEvent(pod, 'test'))

            const labeledPod = {
                ...pod,
                metadata: { ...pod.metadata, labels: { app: 'test' } },
            }
            eventBus.emit(createPodLabeledEvent('test-pod', 'default', { app: 'test' }, labeledPod, pod, 'test'))
            eventBus.emit(createPodAnnotatedEvent('test-pod', 'default', { note: 'test' }, labeledPod, pod, 'test'))

            const labelEvents = eventBus.getHistoryFiltered(byTypes('PodLabeled'))
            expect(labelEvents).toHaveLength(1)
            expect(labelEvents[0].type).toBe('PodLabeled')
        })
    })

    describe('Unsubscribe Mechanism', () => {
        it('should stop receiving events after unsubscribe', () => {
            const eventBus = createEventBus()
            createClusterState(undefined, eventBus)

            let callCount = 0
            const unsubscribe = eventBus.subscribe('PodCreated', () => {
                callCount++
            })

            const pod1 = createTestPod('pod-1')
            eventBus.emit(createPodCreatedEvent(pod1, 'test'))

            expect(callCount).toBe(1)

            unsubscribe()

            const pod2 = createTestPod('pod-2')
            eventBus.emit(createPodCreatedEvent(pod2, 'test'))

            expect(callCount).toBe(1)
        })

        it('should unsubscribe from subscribeAll', () => {
            const eventBus = createEventBus()
            createClusterState(undefined, eventBus)

            let callCount = 0
            const unsubscribe = eventBus.subscribeAll(() => {
                callCount++
            })

            const pod1 = createTestPod('pod-1')
            eventBus.emit(createPodCreatedEvent(pod1, 'test'))

            expect(callCount).toBe(1)

            unsubscribe()

            const pod2 = createTestPod('pod-2')
            eventBus.emit(createPodCreatedEvent(pod2, 'test'))

            expect(callCount).toBe(1)
        })
    })
})

