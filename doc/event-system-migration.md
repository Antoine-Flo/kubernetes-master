# Event System Migration Guide

## Vue d'ensemble

Ce document décrit la migration du Kubernetes Simulator vers une architecture événementielle basée sur CQRS (Command Query Responsibility Segregation) et Event Sourcing.

## Architecture

### Avant (Architecture Directe)
```
Handler → ClusterState.addPod() → État modifié
         → Logger (manuel dans chaque handler)
         → AutoSave (wrapper de chaque méthode)
```

### Après (Architecture Événementielle)
```
Handler → EventBus.emit(PodCreated) → Subscribers:
                                       ├─ ClusterState (écoute et applique)
                                       ├─ Logger (écoute et log)
                                       └─ AutoSave (écoute et sauvegarde)
```

## Bénéfices Réalisés

### ✅ Centralisation
- **Logging centralisé**: Un seul subscriber dans `main.ts` au lieu de logs dispersés
- **Persistence centralisée**: AutoSave simplifié de ~80 lignes à ~15 lignes
- **Audit trail**: Historique complet des événements pour debugging

### ✅ Découplage
- **Handlers indépendants**: Ne connaissent que l'EventBus, pas ClusterState
- **ClusterState isolé**: Devient un simple subscriber, pas de dépendances externes
- **Extensibilité facile**: Ajouter un nouveau subscriber = 1 ligne de code

### ✅ Testabilité
- **Handlers purs**: Les event handlers sont des fonctions pures testables
- **Mock simplifié**: Mock EventBus au lieu de ClusterState complet
- **Tests d'intégration**: Rejouer des événements pour valider le comportement

### ✅ Kubernetes-like
- **Architecture réactive**: Proche du modèle K8s (API server + controllers)
- **Event sourcing**: Comme l'audit log Kubernetes
- **Préparation time-travel**: Infrastructure prête pour replay d'événements (Phase 4)

## Fichiers Créés

### Infrastructure
- `src/cluster/events/types.ts` - Types d'événements et factories
- `src/cluster/events/EventBus.ts` - Bus d'événements central
- `src/cluster/events/handlers.ts` - Handlers purs d'événements

### Tests
- `tests/unit/cluster/events/EventBus.test.ts` - Tests du bus d'événements
- `tests/unit/cluster/events/handlers.test.ts` - Tests des handlers

## Fichiers Modifiés

### Core
- `src/cluster/ClusterState.ts`
  - Ajout `applyEventToState()` avec object lookup
  - Injection EventBus en paramètre optionnel
  - Subscribe automatique aux événements

- `src/main.ts`
  - Création de l'EventBus
  - Subscriber de logging centralisé
  - Passage de l'EventBus à ClusterState et kubectlExecutor

### Handlers kubectl
- `src/kubectl/commands/executor.ts`
  - Injection EventBus dans tous les handlers
  - Modification des wrappers pour passer l'EventBus

- `src/kubectl/commands/handlers/apply.ts`
  - Utilise `applyResourceWithEvents()` si EventBus disponible
  - Fallback sur l'ancienne méthode (backward compatible)

- `src/kubectl/commands/handlers/create.ts`
  - Utilise `createResourceWithEvents()` si EventBus disponible
  - Fallback sur l'ancienne méthode (backward compatible)

- `src/kubectl/commands/handlers/delete.ts`
  - Émet des événements de deletion si EventBus disponible
  - Support ConfigMap et Secret en plus de Pod
  - Fallback sur l'ancienne méthode (backward compatible)

- `src/kubectl/commands/handlers/resourceHelpers.ts`
  - Nouvelles fonctions `applyResourceWithEvents()` et `createResourceWithEvents()`
  - Support de tous les types de ressources (Pod, ConfigMap, Secret)

### Storage
- `src/cluster/storage/autoSave.ts`
  - Nouveau mode event-driven: subscribe aux événements de mutation
  - Simplification majeure: ~80 lignes → ~15 lignes (mode event-driven)
  - Conserve le mode legacy pour backward compatibility

## Utilisation

### Émettre un événement

```typescript
import { createPodCreatedEvent } from './cluster/events/types'

// Dans un handler
const pod = { /* ... */ }
eventBus.emit(createPodCreatedEvent(pod, 'kubectl'))
```

### S'abonner à un événement

```typescript
// S'abonner à un type spécifique
eventBus.subscribe('PodCreated', (event) => {
    console.log('Pod créé:', event.payload.pod.metadata.name)
})

// S'abonner à tous les événements
eventBus.subscribeAll((event) => {
    console.log('Événement:', event.type)
})
```

### Consulter l'historique

```typescript
const history = eventBus.getHistory()
console.log(`${history.length} événements enregistrés`)
```

## Migration Progressive

L'implémentation suit une approche **backward compatible**:

1. ✅ **Phase 1-3 complétée**: Infrastructure + handlers apply/create/delete
2. 🔄 **Phase 4-5 en cours**: Logging centralisé + AutoSave événementiel
3. ⏳ **Phase 6 à venir**: Extension aux autres opérations (label, annotate)
4. ⏳ **Phase 7 à venir**: Tests d'intégration et cleanup

### Activation

L'architecture événementielle est **active par défaut** dans `main.ts`.  
Les handlers utilisent automatiquement l'EventBus s'il est disponible.

### Désactivation

Pour revenir au mode legacy (sans EventBus):
```typescript
// main.ts
const clusterState = createClusterState(clusterStateData) // Sans eventBus
const kubectlExecutor = createKubectlExecutor(clusterState, fileSystem, logger) // Sans eventBus
```

## Événements Disponibles

### Pods
- `PodCreated` - Pod créé
- `PodDeleted` - Pod supprimé
- `PodUpdated` - Pod mis à jour

### ConfigMaps
- `ConfigMapCreated` - ConfigMap créé
- `ConfigMapDeleted` - ConfigMap supprimé
- `ConfigMapUpdated` - ConfigMap mis à jour

### Secrets
- `SecretCreated` - Secret créé
- `SecretDeleted` - Secret supprimé
- `SecretUpdated` - Secret mis à jour

## Prochaines Étapes

### Court terme
- [ ] Migrer `handleLabel` et `handleAnnotate` vers événements
- [ ] Tests d'intégration end-to-end
- [ ] Documentation des patterns pour les contributeurs

### Moyen terme (Phase 2-3)
- [ ] Événements pour Services et Deployments (quand implémentés)
- [ ] Événements pour les opérations filesystem
- [ ] Webhooks simulés (subscriber externe)

### Long terme (Phase 4)
- [ ] Time-travel debugging UI
- [ ] Export/import de scénarios (dump d'événements)
- [ ] Analytics et métriques (subscriber dédié)

## Considérations de Performance

- **Debouncing**: AutoSave utilise un debounce de 500ms
- **Historique**: Limité à 1000 événements avec rotation FIFO
- **Memory**: Chaque événement ~1KB → max 1MB d'historique
- **Subscribers**: O(n) notification où n = nombre de subscribers

## Références

- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [Kubernetes Events](https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/event-v1/)

