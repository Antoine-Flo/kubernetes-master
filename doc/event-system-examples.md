# Event System - Exemples d'Utilisation

## Ajouter un Nouveau Type d'Événement

### 1. Définir le type dans `src/cluster/events/types.ts`

```typescript
// Définir l'interface d'événement
export interface ServiceCreatedEvent extends BaseEvent {
    type: 'ServiceCreated'
    payload: {
        service: Service
    }
}

// Ajouter au type union
export type ClusterEvent =
    | PodCreatedEvent
    | ServiceCreatedEvent  // ← Ajouter ici
    | /* ... autres événements */

// Créer la factory function
export const createServiceCreatedEvent = (service: Service, source?: string): ServiceCreatedEvent => ({
    type: 'ServiceCreated',
    timestamp: createEventTimestamp(),
    metadata: createEventMetadata(source),
    payload: { service },
})
```

### 2. Créer le handler dans `src/cluster/events/handlers.ts`

```typescript
export const handleServiceCreated = (
    state: ClusterStateData,
    event: ServiceCreatedEvent
): ClusterStateData => {
    return {
        ...state,
        services: serviceRepo.add(state.services, event.payload.service),
    }
}
```

### 3. Ajouter au dispatcher dans `src/cluster/ClusterState.ts`

```typescript
const EVENT_HANDLERS: Record<string, (state: ClusterStateData, event: any) => ClusterStateData> = {
    PodCreated: handlePodCreated,
    ServiceCreated: handleServiceCreated,  // ← Ajouter ici
    // ... autres handlers
}
```

## Créer un Nouveau Subscriber

### Exemple: Analytics Tracker

```typescript
// src/analytics/analyticsSubscriber.ts
import type { EventBus } from '../cluster/events/EventBus'

export const createAnalyticsSubscriber = (eventBus: EventBus) => {
    const stats = {
        podsCreated: 0,
        podsDeleted: 0,
        totalOperations: 0,
    }

    // S'abonner à des événements spécifiques
    eventBus.subscribe('PodCreated', () => {
        stats.podsCreated++
        stats.totalOperations++
    })

    eventBus.subscribe('PodDeleted', () => {
        stats.podsDeleted++
        stats.totalOperations++
    })

    // API publique
    return {
        getStats: () => ({ ...stats }),
        reset: () => {
            stats.podsCreated = 0
            stats.podsDeleted = 0
            stats.totalOperations = 0
        },
    }
}

// Dans main.ts
const analytics = createAnalyticsSubscriber(eventBus)
console.log(analytics.getStats()) // { podsCreated: 5, podsDeleted: 2, totalOperations: 7 }
```

### Exemple: Webhook Simulator

```typescript
// src/webhooks/webhookSimulator.ts
import type { EventBus } from '../cluster/events/EventBus'
import type { ClusterEvent } from '../cluster/events/types'

interface WebhookConfig {
    url: string
    events: string[]
}

export const createWebhookSimulator = (eventBus: EventBus, config: WebhookConfig) => {
    const webhookHandler = (event: ClusterEvent) => {
        if (config.events.includes(event.type)) {
            console.log(`[Webhook] Sending to ${config.url}:`, event)
            // En production: fetch(config.url, { method: 'POST', body: JSON.stringify(event) })
        }
    }

    const unsubscribe = eventBus.subscribeAll(webhookHandler)

    return {
        stop: unsubscribe,
    }
}

// Dans main.ts
const webhook = createWebhookSimulator(eventBus, {
    url: 'https://webhook.site/your-id',
    events: ['PodCreated', 'PodDeleted', 'PodFailed'],
})
```

### Exemple: Audit Logger

```typescript
// src/audit/auditLogger.ts
import type { EventBus } from '../cluster/events/EventBus'

export const createAuditLogger = (eventBus: EventBus) => {
    const auditLog: string[] = []

    eventBus.subscribeAll((event) => {
        const timestamp = new Date(event.timestamp).toISOString()
        const source = event.metadata?.source || 'unknown'
        const entry = `[${timestamp}] ${source}: ${event.type}`
        
        auditLog.push(entry)
        
        // Garder seulement les 100 dernières entrées
        if (auditLog.length > 100) {
            auditLog.shift()
        }
    })

    return {
        getAuditLog: () => [...auditLog],
        exportAudit: () => auditLog.join('\n'),
    }
}
```

## Rejouer des Événements (Time-Travel Debugging)

```typescript
// src/debug/timeTravel.ts
import type { EventBus } from '../cluster/events/EventBus'
import { createEmptyState } from '../cluster/ClusterState'

export const replayEvents = (eventBus: EventBus, untilIndex?: number) => {
    const history = eventBus.getHistory()
    const eventsToReplay = untilIndex 
        ? history.slice(0, untilIndex) 
        : history

    // Reconstruire l'état depuis zéro
    let state = createEmptyState()
    
    for (const event of eventsToReplay) {
        state = applyEventToState(state, event)
    }

    return state
}

// Utilisation
const history = eventBus.getHistory()
console.log(`${history.length} événements dans l'historique`)

// Rejouer jusqu'à l'événement 10
const stateAtEvent10 = replayEvents(eventBus, 10)
console.log('État après 10 événements:', stateAtEvent10)
```

## Filtrer les Événements

```typescript
// Obtenir uniquement les événements de création
const creationEvents = eventBus.getHistory().filter(e => 
    e.type.endsWith('Created')
)

// Obtenir les événements Pod uniquement
const podEvents = eventBus.getHistory().filter(e => 
    e.type.startsWith('Pod')
)

// Obtenir les événements depuis kubectl
const kubectlEvents = eventBus.getHistory().filter(e => 
    e.metadata?.source === 'kubectl'
)

// Obtenir les événements des 5 dernières minutes
const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
const recentEvents = eventBus.getHistory().filter(e => 
    new Date(e.timestamp).getTime() > fiveMinutesAgo
)
```

## Tester avec des Événements

```typescript
// tests/integration/event-flow.test.ts
import { describe, it, expect } from 'vitest'
import { createEventBus } from '../../src/cluster/events/EventBus'
import { createClusterState } from '../../src/cluster/ClusterState'
import { createPodCreatedEvent } from '../../src/cluster/events/types'

describe('Event Flow Integration', () => {
    it('should update cluster state when event is emitted', () => {
        const eventBus = createEventBus()
        const clusterState = createClusterState(undefined, eventBus)

        const pod = {
            apiVersion: 'v1',
            kind: 'Pod',
            metadata: { name: 'test-pod', namespace: 'default' },
            spec: { containers: [{ name: 'nginx', image: 'nginx:latest' }] },
            status: { phase: 'Running' },
        }

        // Émettre l'événement
        eventBus.emit(createPodCreatedEvent(pod, 'test'))

        // Vérifier que l'état a été mis à jour
        const pods = clusterState.getPods()
        expect(pods).toHaveLength(1)
        expect(pods[0].metadata.name).toBe('test-pod')
    })

    it('should notify multiple subscribers', () => {
        const eventBus = createEventBus()
        const notifications: string[] = []

        // Subscriber 1: Logger
        eventBus.subscribeAll((event) => {
            notifications.push(`logger: ${event.type}`)
        })

        // Subscriber 2: Analytics
        eventBus.subscribe('PodCreated', (event) => {
            notifications.push(`analytics: ${event.type}`)
        })

        // Émettre événement
        const pod = { /* ... */ }
        eventBus.emit(createPodCreatedEvent(pod, 'test'))

        // Les deux subscribers ont été notifiés
        expect(notifications).toHaveLength(2)
        expect(notifications).toContain('logger: PodCreated')
        expect(notifications).toContain('analytics: PodCreated')
    })
})
```

## Debugging d'Événements

```typescript
// src/debug/eventDebugger.ts
export const createEventDebugger = (eventBus: EventBus) => {
    let isEnabled = false

    const debugSubscriber = (event: ClusterEvent) => {
        if (!isEnabled) {
            return
        }

        console.group(`📡 Event: ${event.type}`)
        console.log('Timestamp:', event.timestamp)
        console.log('Source:', event.metadata?.source)
        console.log('Correlation ID:', event.metadata?.correlationId)
        console.log('Payload:', event.payload)
        console.groupEnd()
    }

    const unsubscribe = eventBus.subscribeAll(debugSubscriber)

    return {
        enable: () => { isEnabled = true },
        disable: () => { isEnabled = false },
        stop: unsubscribe,
    }
}

// Dans la console du navigateur
window.eventDebugger = createEventDebugger(eventBus)
window.eventDebugger.enable()  // Activer le debugging
window.eventDebugger.disable() // Désactiver le debugging
```

## Export/Import de Scénarios

```typescript
// src/scenarios/scenarioManager.ts
export const createScenarioManager = (eventBus: EventBus) => {
    return {
        // Exporter un scénario
        export: (name: string) => {
            const scenario = {
                name,
                timestamp: new Date().toISOString(),
                events: eventBus.getHistory(),
            }
            return JSON.stringify(scenario, null, 2)
        },

        // Importer et rejouer un scénario
        import: (scenarioJson: string) => {
            const scenario = JSON.parse(scenarioJson)
            
            // Vider l'historique actuel
            eventBus.clearHistory()
            
            // Rejouer tous les événements
            for (const event of scenario.events) {
                eventBus.emit(event)
            }
            
            return scenario.name
        },

        // Sauvegarder dans localStorage
        save: (name: string) => {
            const exported = this.export(name)
            localStorage.setItem(`scenario:${name}`, exported)
        },

        // Charger depuis localStorage
        load: (name: string) => {
            const scenarioJson = localStorage.getItem(`scenario:${name}`)
            if (!scenarioJson) {
                throw new Error(`Scenario "${name}" not found`)
            }
            return this.import(scenarioJson)
        },
    }
}
```

## Performance Monitoring

```typescript
// src/monitoring/eventMonitor.ts
export const createEventMonitor = (eventBus: EventBus) => {
    const metrics = {
        totalEvents: 0,
        eventsByType: new Map<string, number>(),
        avgProcessingTime: 0,
    }

    eventBus.subscribeAll((event) => {
        const startTime = performance.now()
        
        metrics.totalEvents++
        
        const currentCount = metrics.eventsByType.get(event.type) || 0
        metrics.eventsByType.set(event.type, currentCount + 1)
        
        const processingTime = performance.now() - startTime
        metrics.avgProcessingTime = 
            (metrics.avgProcessingTime * (metrics.totalEvents - 1) + processingTime) / 
            metrics.totalEvents
    })

    return {
        getMetrics: () => ({
            ...metrics,
            eventsByType: Object.fromEntries(metrics.eventsByType),
        }),
    }
}
```

## Références

- Architecture documentation: `doc/architecture.md`
- Migration guide: `doc/event-system-migration.md`
- Type definitions: `src/cluster/events/types.ts`

