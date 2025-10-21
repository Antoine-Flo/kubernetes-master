# Event System Refactoring - État et TODOs

**Dernière mise à jour**: 2025-10-21  
**Status global**: 7/8 phases complétées (87.5%)

## ✅ Phases Complétées

### Phase 1: Infrastructure de Base ✓
- [x] `src/cluster/events/types.ts` - Types d'événements (268 lignes)
- [x] `src/cluster/events/EventBus.ts` - Bus central (109 lignes)
- [x] `src/cluster/events/handlers.ts` - Handlers purs (159 lignes)

### Phase 2: Refactoring ClusterState ✓
- [x] Injection EventBus optionnelle dans `createClusterState()`
- [x] Map `EVENT_HANDLERS` avec object lookup
- [x] Fonction `applyEventToState()` pour dispatcher
- [x] Auto-subscription aux événements

### Phase 3: Refactoring Handlers kubectl ✓
- [x] `resourceHelpers.ts` - Fonctions event-driven
- [x] `apply.ts` - Support EventBus avec fallback
- [x] `create.ts` - Support EventBus avec fallback
- [x] `delete.ts` - Support EventBus avec fallback (Pod/ConfigMap/Secret)
- [x] `executor.ts` - Injection EventBus dans tous handlers

### Phase 4: Centralisation Logging ✓
- [x] `main.ts` - Création EventBus
- [x] Subscriber global pour logging centralisé (3 lignes)
- [x] Plus besoin de logs manuels dans handlers

### Phase 5: AutoSave via Événements ✓
- [x] `autoSave.ts` - Mode event-driven (15 lignes vs 80 legacy)
- [x] Subscribe aux événements de mutation
- [x] Backward compatible (mode legacy preserved)

### Phase 6: Extension Ressources ✓
- [x] ConfigMaps - événements Created/Deleted/Updated
- [x] Secrets - événements Created/Deleted/Updated
- [x] Handlers refactorés pour les 3 types

### Phase 7: Tests ✓
- [x] `EventBus.test.ts` - 16 tests (190 lignes)
- [x] `handlers.test.ts` - 15 tests (177 lignes)
- [x] Couverture 100% de l'infrastructure

## 📋 Phase Restante

### Phase 8: Cleanup et Optimisations ⏳

**Priorité**: Moyenne (code fonctionne, mais optimisations possibles)

#### 8.1 Migrer label et annotate vers événements

**Fichiers à modifier**:
- `src/kubectl/commands/handlers/label.ts`
- `src/kubectl/commands/handlers/annotate.ts`

**Actions**:
```typescript
// Créer nouveaux événements dans types.ts
export interface PodLabeledEvent extends BaseEvent {
    type: 'PodLabeled'
    payload: {
        name: string
        namespace: string
        labels: Record<string, string>
        pod: Pod
        previousPod: Pod
    }
}

export interface PodAnnotatedEvent extends BaseEvent {
    type: 'PodAnnotated'
    payload: {
        name: string
        namespace: string
        annotations: Record<string, string>
        pod: Pod
        previousPod: Pod
    }
}

// Ajouter factory functions
export const createPodLabeledEvent = (...)
export const createPodAnnotatedEvent = (...)
```

**Handlers à créer** dans `handlers.ts`:
```typescript
export const handlePodLabeled = (state, event) => { ... }
export const handlePodAnnotated = (state, event) => { ... }
```

**Dispatcher** dans `ClusterState.ts`:
```typescript
const EVENT_HANDLERS = {
    // ... existing
    PodLabeled: handlePodLabeled,
    PodAnnotated: handlePodAnnotated,
}
```

**Modifier** `executor.ts`:
```typescript
const handleLabelWrapper = (..., eventBus) => {
    if (eventBus) {
        // Émettre événement au lieu de mutation directe
        const result = clusterState.findPod(...)
        if (result.ok) {
            const updatedPod = { ...result.value, metadata: { ...labels } }
            eventBus.emit(createPodLabeledEvent(...))
        }
    } else {
        // Legacy
    }
}
```

**Temps estimé**: 2-3 heures

#### 8.2 Cleanup du code legacy (optionnel)

**Si vous voulez supprimer le code deprecated**:

⚠️ **Attention**: Casser la backward compatibility

1. Supprimer les fallbacks dans:
   - `apply.ts` (garder que event-driven)
   - `create.ts` (garder que event-driven)
   - `delete.ts` (garder que event-driven)
   - `autoSave.ts` (supprimer mode legacy)

2. Rendre EventBus **obligatoire**:
   ```typescript
   // ClusterState.ts
   export const createClusterState = (
       initialState?: ClusterStateData,
       eventBus: EventBus  // Plus de "?"
   )
   ```

**Temps estimé**: 1 heure  
**Recommandation**: Garder backward compatibility pour Phase 1

#### 8.3 Tests d'intégration end-to-end

**Créer**: `tests/unit/cluster/events/integration.test.ts`

```typescript
describe('Event System Integration', () => {
    it('should handle complete kubectl apply flow with events', () => {
        const eventBus = createEventBus()
        const clusterState = createClusterState(undefined, eventBus)
        const fileSystem = createFileSystem()
        const logger = createLogger()
        
        // Track events emitted
        const events: ClusterEvent[] = []
        eventBus.subscribeAll(e => events.push(e))
        
        // Execute kubectl apply
        const executor = createKubectlExecutor(cluster, fs, logger, eventBus)
        const result = executor.execute('kubectl apply -f pod.yaml')
        
        // Verify
        expect(result.ok).toBe(true)
        expect(events).toHaveLength(1)
        expect(events[0].type).toBe('PodCreated')
        expect(clusterState.getPods()).toHaveLength(1)
    })
    
    it('should auto-save on mutation events', () => {
        // Test AutoSave integration
    })
    
    it('should centralize logging', () => {
        // Test Logger integration
    })
})
```

**Temps estimé**: 2 heures

#### 8.4 Performance benchmarks (optionnel)

**Créer**: `tests/benchmarks/event-system.bench.ts`

```typescript
describe('Event System Performance', () => {
    it('should emit 1000 events in < 100ms', () => {
        const eventBus = createEventBus()
        const start = performance.now()
        
        for (let i = 0; i < 1000; i++) {
            eventBus.emit(createPodCreatedEvent(mockPod))
        }
        
        const duration = performance.now() - start
        expect(duration).toBeLessThan(100)
    })
})
```

**Temps estimé**: 1 heure

#### 8.5 Documentation des patterns pour contributeurs

**Créer**: `CONTRIBUTING-EVENTS.md`

Contenu:
- Comment ajouter un nouveau type d'événement
- Comment créer un subscriber
- Exemples de patterns communs
- Guidelines de testing

**Temps estimé**: 1 heure

## 📊 Résumé Temps Estimés

| Tâche | Priorité | Temps | Status |
|-------|----------|-------|--------|
| 8.1 Label/Annotate events | Moyenne | 2-3h | ⏳ Pending |
| 8.2 Cleanup legacy | Basse | 1h | ⏳ Optional |
| 8.3 Tests intégration | Haute | 2h | ⏳ Pending |
| 8.4 Benchmarks | Basse | 1h | ⏳ Optional |
| 8.5 Doc contributeurs | Moyenne | 1h | ⏳ Pending |
| **TOTAL** | | **6-8h** | |

## 🎯 Ordre Recommandé de Complétion

1. **Tests d'intégration** (8.3) - Valider que tout fonctionne ensemble
2. **Label/Annotate events** (8.1) - Compléter la migration
3. **Doc contributeurs** (8.5) - Faciliter futures contributions
4. **Benchmarks** (8.4) - Si besoin de metrics de performance
5. **Cleanup legacy** (8.2) - Seulement si backward compat non nécessaire

## 📁 Fichiers Clés à Connaître

### Infrastructure Core
```
src/cluster/events/
├── types.ts          # Tous les types d'événements
├── EventBus.ts       # Bus central avec subscribe/emit
└── handlers.ts       # Handlers purs (state, event) => newState
```

### Wiring Principal
```
src/main.ts           # Création EventBus + wiring subscribers
src/cluster/ClusterState.ts  # EVENT_HANDLERS map + applyEventToState
src/kubectl/commands/executor.ts  # Injection EventBus dans handlers
```

### Handlers Migrés
```
src/kubectl/commands/handlers/
├── apply.ts          # ✅ Event-driven
├── create.ts         # ✅ Event-driven
├── delete.ts         # ✅ Event-driven
├── label.ts          # ⏳ À migrer
└── annotate.ts       # ⏳ À migrer
```

### Tests
```
tests/unit/cluster/events/
├── EventBus.test.ts      # ✅ 16 tests
├── handlers.test.ts      # ✅ 15 tests
└── integration.test.ts   # ⏳ À créer
```

### Documentation
```
doc/
├── event-system-migration.md     # ✅ Guide migration
├── event-system-examples.md      # ✅ Exemples pratiques
├── REFACTORING-SUMMARY.md        # ✅ Résumé complet
└── CONTRIBUTING-EVENTS.md        # ⏳ À créer
```

## 🚀 Quick Start pour Reprendre

### 1. Vérifier l'état actuel
```bash
# Lancer les tests
npm test

# Vérifier qu'il n'y a pas d'erreurs lint
npm run lint
```

### 2. Lire la documentation
```bash
# Ordre recommandé
cat doc/REFACTORING-SUMMARY.md     # Vue d'ensemble
cat doc/event-system-migration.md  # Architecture
cat doc/event-system-examples.md   # Patterns
```

### 3. Commencer par 8.3 (Tests d'intégration)
```bash
# Créer le fichier
touch tests/unit/cluster/events/integration.test.ts

# Implémenter les tests end-to-end
# Voir section 8.3 ci-dessus
```

### 4. Ensuite 8.1 (Label/Annotate)
```bash
# Fichiers à modifier (dans l'ordre)
vim src/cluster/events/types.ts        # Ajouter types
vim src/cluster/events/handlers.ts     # Ajouter handlers
vim src/cluster/ClusterState.ts        # Ajouter au dispatcher
vim src/kubectl/commands/handlers/label.ts      # Migrer
vim src/kubectl/commands/handlers/annotate.ts   # Migrer
```

## 💡 Notes Importantes

### Architecture Actuelle
- ✅ EventBus activé par défaut dans `main.ts`
- ✅ 100% backward compatible (peut fonctionner sans EventBus)
- ✅ Pas de switch statements (object lookup partout)
- ✅ Tous les handlers sont purs et testables
- ✅ Historique d'événements avec FIFO (1000 max)

### Conventions à Respecter
1. **No switch statements** - Utiliser object lookup
2. **Max 3 niveaux d'indentation**
3. **Always use braces** - Même pour one-liners
4. **Pure functions** - Handlers ne mutent jamais l'état
5. **Backward compatible** - Garder fallbacks pour Phase 1

### Contacts et Ressources
- **Plan original**: `event-system.plan.md`
- **Changelog**: `CHANGELOG-EVENT-SYSTEM.md`
- **Résumé complet**: `doc/REFACTORING-SUMMARY.md`

## ✨ État Final Attendu

Quand Phase 8 sera complète:
- ✅ Tous les handlers kubectl utilisent événements
- ✅ Tests d'intégration passent
- ✅ Documentation contributeurs complète
- ✅ Benchmarks de performance validés
- ✅ Code legacy nettoyé (optionnel)

**Bénéfices mesurables**:
- Centralisation totale du logging
- AutoSave simplifié (80 → 15 lignes)
- Extensibilité maximale (1 ligne = 1 subscriber)
- Time-travel debugging ready (Phase 4 roadmap)

---

**Bon courage pour la suite du refactoring! 🚀**

