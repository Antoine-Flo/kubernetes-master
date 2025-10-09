# 🗺️ Roadmap - Simulateur kubectl

## 📊 État actuel du projet

### ✅ Terminé
- **Sprint 1 (Terminal)**: Terminal xterm.js fonctionnel, thème dark, TDD (9 tests ✓)
- **Sprint 2 (Cluster Foundation)**: Pod model + ClusterState avec architecture hybrid (43 tests ✓)
  - Architecture validée: Pure functions + Closure-based facade
  - Seed cluster avec 4 pods réalistes
  - 52 tests total passent

### 🔄 En cours
- Sprint 3: Command Parser + Executor (kubectl)

### 📋 À venir
- Sprint 4: FileSystem + Shell Commands
- Sprint 5: kubectl Handlers (get, describe, delete, apply)
- Sprint 6: Integration + Polish (MVP)
- Phase 2: Enhanced Features (editor, history)
- Phase 3: Learning Platform (challenges, lessons, visualizer)

---

## 🎯 Sprint 1 : Terminal Foundation ✅ TERMINÉ

**Objectif**: Terminal xterm.js fonctionnel avec saisie de commandes

**Réalisations**:
- TerminalManager (factory function + closures)
- Prompt `kubectl> ` avec gestion Enter/Backspace
- Thème dark, centré, focus automatique
- 9 tests passent
- Architecture fonctionnelle validée

---

## 🎯 Sprint 2 : Cluster State Foundation ✅ TERMINÉ

**Objectif**: Modèle de données du cluster avec architecture testable

**Réalisations**:
- Pod model + factory function (immutable, frozen)
- ClusterState avec architecture hybrid (pure functions + closure facade)
- Seed cluster: 4 pods dans 2 namespaces
- 43 tests cluster, 52 tests total
- Typed results (discriminated unions)

**Architecture validée**:
- Pure functions pour opérations d'état (testables)
- Closure-based facade (API pratique)
- Immutabilité complète (Object.freeze)
- Séparation des préoccupations (models/operations/facade/seed)

**Note**: StorageAdapter et autres ressources (Deployment/Service) reportés après validation du flow end-to-end

---

## 🎯 Sprint 3 : kubectl Parser + Executor

**Objectif**: Infrastructure pour interpréter et router les commandes kubectl

**Tâches**:

### 3.1 - Parsing Utilities (TDD)
- [ ] `src/kubectl/commands/parser.ts` - Fonctions pures de parsing
  - `parseCommand(input: string)` → `{ action, resource, name?, flags? }`
  - Parser flags (`-n`, `-o`, etc.)
  - Parser noms de ressources
  - Validation de syntaxe
- [ ] ~15-20 tests

### 3.2 - kubectl Executor (TDD)
- [ ] `src/kubectl/commands/executor.ts`
  - Factory `createKubectlExecutor(clusterState, fileSystem)`
  - Route vers handlers (map de fonctions)
  - Gestion d'erreurs (commande inconnue, ressource manquante)
- [ ] ~10-15 tests

### 3.3 - Integration avec Terminal
- [ ] Connecter parser/executor au TerminalManager
- [ ] Test end-to-end: saisir commande → parser → executor → output

**Définition de Done**:
- Parser reconnaît syntaxe kubectl basique
- Executor route correctement
- Tests > 80% coverage
- Flow end-to-end fonctionne (sans handlers encore)

**Note**: Parsing utilities peuvent être réutilisées pour shell commands (Sprint 4)

---

## 🎯 Sprint 4 : FileSystem + Shell Commands

**Objectif**: Système de fichiers virtuel et commandes shell de base

**Tâches**:

### 4.1 - FileSystem Models (TDD)
- [ ] `src/filesystem/models/File.ts` - Factory pour fichiers YAML
- [ ] `src/filesystem/models/Directory.ts` - Factory pour dossiers
- [ ] Immutabilité (Object.freeze)
- [ ] ~8-10 tests

### 4.2 - FileSystem State (TDD)
- [ ] `src/filesystem/FileSystem.ts` - Architecture hybrid (comme ClusterState)
  - Pure functions: `resolvePath()`, `findNode()`, `getDepth()`
  - Closure facade: `createFileSystem()`
  - Operations: `changeDirectory()`, `listDirectory()`, `createDirectory()`, `createFile()`, `readFile()`, `writeFile()`
  - Validation max depth (3 niveaux)
  - Typed results (discriminated unions)
- [ ] ~20-25 tests

### 4.3 - Seed FileSystem (TDD)
- [ ] `src/filesystem/seedFileSystem.ts`
  - Structure: `/examples/` avec pod/deployment/service YAML
  - Dossier `/manifests/` vide pour l'utilisateur
  - Fonction pure `createSeedFileSystem(): FileSystem`
- [ ] ~8-10 tests

### 4.4 - Shell Parser + Executor (TDD)
- [ ] `src/shell/commands/parser.ts` - Réutilise utilities de kubectl parser
  - Parse: cd, ls, pwd, mkdir, touch, cat, rm, clear, help
- [ ] `src/shell/commands/executor.ts`
  - Factory `createShellExecutor(fileSystem)`
  - Route vers handlers
- [ ] ~15-20 tests

### 4.5 - Shell Handlers (TDD)
- [ ] `src/shell/commands/handlers/cd.ts` - Change directory
- [ ] `src/shell/commands/handlers/ls.ts` - List directory (+ formatter)
- [ ] `src/shell/commands/handlers/pwd.ts` - Print working directory
- [ ] `src/shell/commands/handlers/mkdir.ts` - Create directory
- [ ] `src/shell/commands/handlers/touch.ts` - Create file
- [ ] `src/shell/commands/handlers/cat.ts` - Read file
- [ ] `src/shell/commands/handlers/rm.ts` - Remove file/directory
- [ ] ~30-35 tests

### 4.6 - Command Dispatcher (TDD)
- [ ] `src/main.ts` - Dispatcher qui route kubectl vs shell
  - Si commence par "kubectl" → kubectlExecutor
  - Sinon → shellExecutor
- [ ] Prompt dynamique: `kubectl>` à la racine, `~/path>` ailleurs
- [ ] ~5-8 tests

**Définition de Done**:
- FileSystem fonctionne (création/navigation/lecture)
- Commandes shell de base implémentées
- Prompt s'adapte selon le chemin
- Max depth (3 niveaux) respecté
- Tests > 80% coverage
- ~90-100 tests au total

---

## 🎯 Sprint 5 : kubectl Handlers + Formatters

**Objectif**: Implémenter les commandes kubectl essentielles

**Tâches**:

### 5.1 - Table Formatter (TDD)
- [ ] `src/kubectl/formatters/table-formatter.ts`
  - Fonction pure `formatTable(headers, rows): string`
  - Calcul largeur colonnes
  - Alignement, padding
  - Format ASCII (comme kubectl)
- [ ] ~10-12 tests

### 5.2 - Get Handlers (TDD)
- [ ] `src/kubectl/commands/handlers/get.ts`
  - `handleGetPods(state, namespace?)` → tableau formaté
  - `handleGetNamespaces(state)` → liste namespaces
  - Filtre par namespace (`-n` flag)
  - Format: NAME | STATUS | AGE | etc.
  - Calcul AGE (fonction utilitaire)
- [ ] ~15-20 tests

### 5.3 - Describe Handler (TDD)
- [ ] `src/kubectl/commands/handlers/describe.ts`
  - `handleDescribePod(state, name, namespace?)`
  - Format multi-lignes (Name, Labels, Status, Containers, Ports)
  - Gestion erreur (pod not found)
- [ ] ~8-10 tests

### 5.4 - Delete Handler (TDD)
- [ ] `src/kubectl/commands/handlers/delete.ts`
  - `handleDeletePod(state, name, namespace?)`
  - Message confirmation: `pod "name" deleted`
  - Gestion erreur (pod not found)
- [ ] ~8-10 tests

### 5.5 - Apply/Create Handlers (TDD)
- [ ] Install `js-yaml` dependency
- [ ] `src/kubectl/commands/handlers/apply.ts`
  - `handleApply(state, fileSystem, filePath)`
  - Read file from fileSystem
  - Parse YAML (`js-yaml`)
  - Create/update resource in cluster
  - Support Pod (autres ressources en Phase 2)
- [ ] `src/kubectl/commands/handlers/create.ts` - Similar à apply
- [ ] ~15-20 tests

**Définition de Done**:
- `kubectl get pods` affiche tableau formaté
- `kubectl describe pod <name>` affiche détails
- `kubectl delete pod <name>` supprime le pod
- `kubectl apply -f <path>` crée ressource depuis fichier
- kubectl + filesystem intégrés
- Tests > 80% coverage
- ~60-70 tests

---

## 🎯 Sprint 6 : Storage + Integration + Polish (MVP)

**Objectif**: Persistance et intégration finale pour MVP production-ready

**Tâches**:

### 6.1 - Storage Adapter (TDD)
- [ ] `src/cluster/storage/adapter.ts`
  - Factory `createStorageAdapter(storageType: 'localStorage' | 'indexedDB')`
  - Operations: `save(key, data)`, `load(key)`, `clear()`
  - Gestion erreurs (quota exceeded, etc.)
  - Support ClusterState + FileSystem
- [ ] Consider IndexedDB for better storage capacity
- [ ] ~10-15 tests

### 6.2 - Integration (TDD)
- [ ] `src/main.ts` - Orchestration complète
  - Load ClusterState from storage (ou seed si vide)
  - Load FileSystem from storage (ou seed si vide)
  - Initialize executors (kubectl + shell)
  - Initialize dispatcher
  - Auto-save on state changes
- [ ] Tests end-to-end: commande complète → storage → reload
- [ ] ~8-10 tests

### 6.3 - Error Handling & UX
- [ ] Messages d'erreur clairs et pédagogiques
- [ ] Commande `help` avec liste complète
- [ ] Commande `reset` pour réinitialiser au seed
- [ ] Gestion erreurs graceful (no crashes)

### 6.4 - UI Polish
- [ ] Responsive design (mobile/tablet)
- [ ] ANSI colors (green=success, red=error, yellow=warning)
- [ ] Favicon + title
- [ ] Loading states

### 6.5 - Documentation & Tests
- [ ] README à jour avec exemples
- [ ] Couverture tests > 80% globale
- [ ] Test manuel de tous les flows
- [ ] ~200+ tests total

**Définition de Done (MVP Ready)**:
- Flow complet: créer fichier → éditer → apply → voir dans cluster
- Navigation filesystem + kubectl intégrés
- Persistance fonctionne (reload page = état préservé)
- Messages d'erreur clairs
- UI responsive et polie
- Documentation complète
- Prêt pour déploiement

---

## 🚀 Phase 2 : Enhanced Features

**Objectif**: Améliorer l'expérience utilisateur et ajouter des fonctionnalités avancées

### Terminal-based YAML Editor (Priority 1)
- Éditeur intégré dans xterm (nano-like)
- Navigation flèches, édition, Ctrl+S/Ctrl+Q
- Intégration avec `kubectl edit` et `touch`
- Aucune dépendance externe (utilise xterm ANSI sequences)

### Additional Resources (Priority 2)
- Deployment model + controllers (crée/supprime pods automatiquement)
- Service model + selectors
- Namespace CRUD complet
- ReplicaSet support

### Enhanced Terminal (Priority 3)
- Historique commandes (↑↓)
- Autocomplétion (Tab)
- Ctrl+C pour annuler

### Advanced kubectl Features (Priority 4)
- `kubectl logs pod-name` - Logs simulés
- `kubectl exec` - Shell interactif simulé
- `kubectl scale` - Scaling dynamique
- Events logging

**Estimé**: 3-4 sprints additionnels après MVP

---

## 🎓 Phase 3 : Learning Platform

**Objectif**: Transformer le simulateur en plateforme d'apprentissage interactive

### Challenges System

#### Objectif
Système de challenges avec seed clusters personnalisés et validation

#### Tâches

##### 7.1 - Challenge Models (TDD)
- [ ] `tests/unit/learning/challenges/Challenge.test.ts`
- [ ] `src/learning/challenges/Challenge.ts`
  - Interface Challenge, Objective, ValidationResult
  - Factory function `createChallenge()`
  - Factory function `createObjective()`

##### 7.2 - Scenario Seeds (TDD)
- [ ] `src/learning/challenges/scenarios/debugCrashingPod.ts`
  - Seed cluster avec pod en CrashLoopBackOff
  - Objectives définis
  - Validator function (pure)
- [ ] `src/learning/challenges/scenarios/scalingDeployment.ts`
  - Seed cluster avec deployment sous-dimensionné
  - Objectives de scaling
- [ ] `src/learning/challenges/scenarios/networkingIssue.ts`
  - Service avec mauvais selectors
  - Objectives de correction

##### 7.3 - Challenge Validator (TDD)
- [ ] `tests/unit/learning/challenges/validator.test.ts`
- [ ] `src/learning/challenges/validator.ts`
  - Fonction pure `validateChallenge(challenge, state, commandHistory)`
  - Check objectives completion
  - Return typed ValidationResult

##### 7.4 - Challenge UI (TDD)
- [ ] `src/learning/challenges/ChallengeUI.ts`
  - Factory function pour UI de challenge
  - Affichage objectives (checkboxes)
  - Affichage hints progressifs
  - Boutons: Reset, Show Hint, Validate

**Définition de Done Sprint 7:**
- 3+ challenges fonctionnels avec validation
- UI affiche objectives et hints
- Validation automatique des solutions
- Tests > 80%

---

### Sprint 8 : Lessons System

#### Objectif
Tutoriels interactifs avec contenu pédagogique structuré

#### Tâches

##### 8.1 - Lesson Models (TDD)
- [ ] `tests/unit/learning/lessons/Lesson.test.ts`
- [ ] `src/learning/lessons/Lesson.ts`
  - Interface Lesson, LessonSection, ExerciseContent
  - Factory functions
  - Progress tracking

##### 8.2 - Lesson Content (Data)
- [ ] `src/learning/lessons/content/introPods.ts`
  - Lesson complète sur les Pods
  - Sections: théorie, exemples, exercices
  - Playground state inclus
- [ ] `src/learning/lessons/content/deployments.ts`
- [ ] `src/learning/lessons/content/services.ts`

##### 8.3 - Lesson UI (TDD)
- [ ] `tests/unit/learning/lessons/LessonUI.test.ts`
- [ ] `src/learning/lessons/LessonUI.ts`
  - Factory function pour UI de lesson
  - Rendu des sections (text, example, exercise)
  - Navigation (Previous, Next)
  - Progress bar
  - Integration avec terminal pour exercices

##### 8.4 - Exercise Validation
- [ ] Validation des exercices pratiques
- [ ] Feedback immédiat
- [ ] Affichage solution si bloqué

**Définition de Done Sprint 8:**
- 3+ lessons complètes
- Navigation fluide entre sections
- Exercices validables
- Progress tracking fonctionnel

---

### Sprint 9 : Cluster Visualizer

#### Objectif
Visualisation graphique de l'état du cluster

#### Tâches

##### 9.1 - Visualizer Foundation (TDD)
- [ ] `tests/unit/learning/visualizer/ClusterVisualizer.test.ts`
- [ ] `src/learning/visualizer/ClusterVisualizer.ts`
  - Factory function `createClusterVisualizer()`
  - Support de modes: tree, cards, graph
  - API: render(state), setMode(mode), destroy()

##### 9.2 - Tree View Renderer (TDD)
- [ ] `src/learning/visualizer/renderers/tree.ts`
  - Fonction pure `renderTree(state): HTMLElement`
  - Structure arborescente avec accordéons daisyUI
  - Icônes pour types de ressources
  - Couleurs pour statuts (green/red/yellow)

##### 9.3 - Cards Grid Renderer (TDD)
- [ ] `src/learning/visualizer/renderers/cards.ts`
  - Fonction pure `renderCards(state): HTMLElement`
  - Grid responsive de cards daisyUI
  - Badges pour statuts
  - Click pour détails

##### 9.4 - Graph View Renderer (Optionnel)
- [ ] SVG-based graph (nodes + edges)
- [ ] Layout algorithm (simple force-directed?)
- [ ] Relations visuelles (Service → Pods)

**Définition de Done Sprint 9:**
- Tree view fonctionnelle
- Cards view fonctionnelle
- Sync avec terminal (changements reflétés)
- Responsive design
- Graph view (optionnel, peut être Phase 4)

---

### Sprint 10 : Layout Integration & Modes

#### Objectif
Intégrer tous les composants dans des layouts adaptés

#### Tâches

##### 10.1 - Layout Manager (TDD)
- [ ] `src/learning/LayoutManager.ts`
  - Factory function pour gérer les layouts
  - Modes: terminal-only, learning, challenge, visual
  - Responsive breakpoints
  - Transitions fluides entre modes

##### 10.2 - Mode Selector UI
- [ ] Header avec boutons de mode
- [ ] Persistance du mode choisi (localStorage)
- [ ] Shortcuts clavier (Ctrl+1, Ctrl+2, etc.)

##### 10.3 - Responsive Layouts
- [ ] Desktop: split views (70/30 ou 50/50)
- [ ] Tablet: collapsible panels
- [ ] Mobile: tabs/accordions pour changer de vue

##### 10.4 - Integration Tests
- [ ] Tests end-to-end pour chaque mode
- [ ] Terminal + Lesson interaction
- [ ] Terminal + Challenge validation
- [ ] Terminal + Visualizer sync

**Définition de Done Sprint 10:**
- 4 modes fonctionnels et switchables
- Layouts responsive
- Tous les composants s'intègrent proprement
- UX cohérente entre modes

---

### Sprint 11 : Gamification & Polish

#### Objectif
Gamification et finitions pour la learning platform

#### Tâches

##### 11.1 - Progress Tracking
- [ ] Model: UserProgress (challenges completed, lessons done, etc.)
- [ ] Persistance localStorage
- [ ] Stats dashboard

##### 11.2 - Achievements/Badges
- [ ] Système de badges (First pod deleted, 5 challenges completed, etc.)
- [ ] UI pour afficher badges earned
- [ ] Animations/celebratory feedback

##### 11.3 - Hints System
- [ ] Progressive hints pour challenges
- [ ] Hint counter (scoring penalty?)
- [ ] Contextual tips

##### 11.4 - Polish & UX
- [ ] Animations transitions
- [ ] Loading states
- [ ] Empty states (no challenges started)
- [ ] Error states
- [ ] Accessibility (ARIA labels, keyboard navigation)

##### 11.5 - Documentation
- [ ] Update README avec learning features
- [ ] Créer guide pour ajouter challenges/lessons
- [ ] Screenshots/GIFs des différents modes

**Définition de Done Sprint 11:**
- Gamification complète
- UX polie et accessible
- Documentation à jour
- Learning platform production-ready

---

## 📈 Métriques de succès

### Sprint 1 ✅
- [x] Terminal s'affiche correctement
- [x] Tests passent (9/9 TerminalManager)
- [x] ~200 lignes de code

### Sprint 2 (Phase 1 - Foundation) ✅
- [x] Couverture tests > 90% (100% pour Pod et ClusterState)
- [x] Architecture validée et testable
- [x] 52 tests total passent
- [ ] Seed cluster a 10+ ressources (actuellement 4 pods - suffisant pour foundation)

### Sprint 3-4
- [ ] 4+ commandes fonctionnelles
- [ ] Output formaté proprement

### Sprint 5-6 (MVP)
- [ ] MVP complet utilisable
- [ ] Documentation existe
- [ ] Déployable

### Phase 3 (Learning Platform)
- [ ] Challenges system avec 10+ scenarios
- [ ] Lessons system avec 10+ tutorials
- [ ] Cluster visualizer (3 modes)
- [ ] Gamification & achievements
- [ ] 90%+ test coverage

---

## 🔄 Workflow de développement

Pour chaque feature:
1. **RED** : Écrire le test (qui échoue)
2. **GREEN** : Implémenter le minimum pour passer le test
3. **REFACTOR** : Nettoyer le code
4. **COMMIT** : Commit avec message clair
5. **REPEAT** : Feature suivante

### Commandes utiles
```bash
npm run dev        # Lancer le dev server
npm test          # Lancer tous les tests
npm test -- --ui  # UI vitest (si installé)
npm run build     # Build production
```

---

## 🎯 Priorités actuelles

### ✅ Terminé
1. ✅ Sprint 1 complet (Terminal fonctionnel)
2. ✅ Sprint 2 Phase 1 (Pod model + ClusterState architecture)
3. ✅ Architecture hybrid validée (pure functions + closures)

### 🔜 Prochaines étapes

#### Court terme (Sprint 3-6)
1. **Option A**: Continuer Sprint 3 (Command Parser + Executor)
   - Parser pour `kubectl get pods`
   - Executor qui utilise ClusterState
   - Formatters pour output tableau
   
2. **Option B**: Compléter Sprint 2
   - StorageAdapter (localStorage)
   - Autres ressources (Deployment, Service)
   
3. **Recommandation**: Option A pour valider le flow end-to-end rapidement

#### Long terme (Phase 3 - Learning Platform)
1. **Challenges System** : Scenarios basés sur seed clusters customisés
   - User doit diagnostiquer/résoudre problèmes
   - Validation automatique des solutions
   - Hints progressifs

2. **Lessons UI** : Interface pédagogique split-view
   - Panneau latéral avec contenu théorique
   - Terminal pour pratique simultanée
   - Exercices interactifs validés

3. **Cluster Visualizer** : Représentation visuelle du cluster
   - Tree view (simple, prioritaire)
   - Cards grid (responsive)
   - Graph view (optionnel, avancé)

### Questions en suspens
- [x] Architecture state management → Hybrid (pure functions + facade)
- [x] Immutabilité → Object.freeze + nouvelles copies
- [x] Error handling → Discriminated unions (pas d'exceptions)
- [ ] Couleurs ANSI dans terminal (phase 1 ou 2?)
- [ ] Format de date pour AGE (relative comme kubectl?)
- [ ] Support de `kubectl get all` en phase 1?
- [ ] Visualizer: Graph view ou Tree view en priorité? (Phase 3)
- [ ] Format de contenu pour lessons: Markdown, JSON, ou TypeScript? (Phase 3)
- [ ] Scoring system pour challenges? (Phase 3)


