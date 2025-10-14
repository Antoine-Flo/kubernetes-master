# 🗺️ Roadmap - Simulateur kubectl

## 📊 État actuel du projet

**218 tests passent** | **Coverage: 88.86%** | **Architecture: Functional (Factory + Pure functions)**

### ✅ Completé
- **Sprint 1**: Terminal xterm.js fonctionnel (9 tests)
- **Sprint 2**: Pod model + ClusterState (43 tests)
- **Sprint 3.1**: Parser kubectl avec aliases (33 tests)
- **Sprint 3.2**: Executor avec routing (24 tests)
- **Sprint 3.3**: Terminal Integration (8 tests)
- **Sprint 4.1-4.3**: FileSystem Foundation (103 tests) - Library-ready design

### 🎯 Prochaine étape
**Sprint 4.4-4.8** - Shell Commands, Image Registry, Logger, Dispatcher

### 📋 À venir
- Sprint 4: FileSystem + Shell Commands
- Sprint 5: kubectl Handlers + Formatters
- Sprint 6: Storage + Integration (MVP)
- Phase 2: Enhanced Features
- Phase 3: Learning Platform

---

## ✅ Sprint 3.3 : Integration avec Terminal (TERMINÉ)

**Objectif**: Connecter le parser/executor au terminal pour un flow end-to-end

### Tâches
- [x] Connecter parser/executor au TerminalManager
- [x] Dispatcher: router kubectl vs shell commands (préparation Sprint 4)
- [x] Test end-to-end: saisir commande → parser → executor → output dans terminal
- [x] 8 tests d'intégration

### Définition de Done
- ✅ Commande `kubectl get pods` fonctionne dans le terminal
- ✅ Output s'affiche correctement
- ✅ Erreurs remontées au terminal
- ✅ Flow complet validé

---

## 🎯 Sprint 4 : FileSystem + Shell Commands

**Objectif**: Système de fichiers virtuel et commandes shell de base

### 4.1 - FileSystem Models (TDD) ✅ TERMINÉ
- [x] `src/filesystem/models/File.ts` - Factory pour fichiers multi-formats
- [x] `src/filesystem/models/Directory.ts` - Factory pour dossiers
- [x] Support extensions: `.yaml`, `.yml`, `.json`, `.kyaml`
- [x] Immutabilité (Object.freeze)
- [x] 24 tests (File: 18, Directory: 6)

### 4.2 - FileSystem State (TDD) ✅ TERMINÉ
- [x] `src/filesystem/FileSystem.ts` - Architecture hybrid (comme ClusterState)
  - Pure functions: `resolvePath()`, `findNode()`, `getDepth()`, `validateFilename()`
  - Closure facade: `createFileSystem()`
  - Operations: `changeDirectory()`, `listDirectory()`, `createDirectory()`, `createFile()`, `readFile()`, `writeFile()`, `deleteFile()`, `deleteDirectory()`
  - Validation max depth (3 niveaux)
  - Typed results (discriminated unions)
- [x] 69 tests

### 4.3 - Seed FileSystem (TDD) ✅ TERMINÉ
- [x] `src/filesystem/seedFileSystem.ts`
  - Structure: `/examples/` avec pod (YAML), deployment (YML), service (JSON)
  - Dossier `/manifests/` vide pour l'utilisateur
  - Fonction pure `createSeedFileSystem(): FileSystemState`
- [x] 10 tests

### 4.4 - Shell Parser + Executor (TDD)
- [ ] `src/shell/commands/parser.ts` - Parse: cd, ls, pwd, mkdir, touch, cat, rm, clear, help
- [ ] `src/shell/commands/executor.ts` - Factory `createShellExecutor(fileSystem)`
- [ ] ~15-20 tests

### 4.5 - Image Registry + Pull Simulation (TDD)
- [ ] `src/cluster/registry/ImageRegistry.ts`
  - 7-10 images de base (nginx, redis, postgres, mysql, busybox, broken-app, private-image)
  - Parser format image: `[registry/]name[:tag]`
  - Validation stricte (reject images inconnues avec message clair)
  - ImageManifest: comportement, ports, logGenerator par image
- [ ] `src/cluster/controllers/ImagePuller.ts`
  - Pure function `simulateImagePull(imageString): PullResult`
  - Events de pull (Pulling, Pulled, Created, Started)
  - Support ImagePullBackOff pour images invalides
  - Support CrashLoopBackOff pour broken-app
- [ ] Handler `debug images` - Liste images disponibles dans le registry
- [ ] UI: Registry panel (liste images + tags disponibles)
- [ ] ~20-25 tests

### 4.6 - Shell Handlers (TDD)
- [ ] `src/shell/commands/handlers/cd.ts` - Change directory
- [ ] `src/shell/commands/handlers/ls.ts` - List directory (+ formatter)
- [ ] `src/shell/commands/handlers/pwd.ts` - Print working directory
- [ ] `src/shell/commands/handlers/mkdir.ts` - Create directory
- [ ] `src/shell/commands/handlers/touch.ts` - Create file
- [ ] `src/shell/commands/handlers/cat.ts` - Read file
- [ ] `src/shell/commands/handlers/rm.ts` - Remove file/directory
- [ ] ~30-35 tests

### 4.7 - Application Logger (TDD)
- [ ] `src/logger/Logger.ts` - Factory `createLogger()`
  - Log levels: info, warn, error, debug
  - Categories: COMMAND, EXECUTOR, FILESYSTEM, CLUSTER
  - In-memory rotation (max 500 entries)
  - Mirror to console en dev mode
- [ ] Intégration dans dispatcher, executor, filesystem
- [ ] Shell command handler `debug` pour afficher/clear logs
- [ ] ~5-8 tests

### 4.8 - Command Dispatcher (TDD)
- [ ] `src/main.ts` - Dispatcher qui route kubectl vs shell
  - Si commence par "kubectl" → kubectlExecutor
  - Sinon → shellExecutor
- [ ] Prompt dynamique: `kubectl>` à la racine, `~/path>` ailleurs
- [ ] ~5-8 tests

### Définition de Done
- FileSystem fonctionne (création/navigation/lecture)
- Image Registry avec 7-10 images disponibles
- Pull simulation avec events (ImagePullBackOff si image inconnue)
- Commandes shell de base implémentées
- Logger applicatif intégré (commande `debug`)
- UI Registry panel visible (liste images disponibles)
- Prompt s'adapte selon le chemin
- Max depth (3 niveaux) respecté
- Tests > 80% coverage

---

## 🎯 Sprint 5 : kubectl Handlers + Formatters

**Objectif**: Implémenter les commandes kubectl essentielles avec formatage propre

### 5.1 - Table Formatter (TDD)
- [ ] `src/kubectl/formatters/table-formatter.ts`
  - Fonction pure `formatTable(headers, rows): string`
  - Calcul largeur colonnes, alignement, padding
  - Format ASCII (comme kubectl)
- [ ] ~10-12 tests

### 5.2 - Get Handlers (TDD)
- [ ] Améliorer `src/kubectl/commands/handlers/get.ts`
  - Utiliser table formatter
  - Support tous les types de ressources
  - Filtre par namespace (`-n` flag)
  - Calcul AGE (fonction utilitaire)
  - Logger les requêtes (application logger)
- [ ] ~15-20 tests

### 5.3 - Describe Handler (TDD)
- [ ] Améliorer `src/kubectl/commands/handlers/describe.ts`
  - Format multi-lignes détaillé
  - Affichage complet des métadonnées
- [ ] ~8-10 tests

### 5.4 - Apply/Create Handlers (TDD)
- [ ] Install `js-yaml` dependency
- [ ] Améliorer `src/kubectl/commands/handlers/apply.ts`
  - Read file from FileSystem
  - Parse YAML (`js-yaml`)
  - Create/update resource in cluster
- [ ] ~15-20 tests

### 5.5 - kubectl logs Handler (TDD)
- [ ] Améliorer Pod model: `status.logs: LogEntry[]`
- [ ] **Préparer Chaos Hooks** : Ajouter `chaosConfig?: ChaosConfig` dans Pod/Deployment models
  - Flags pour injection future d'erreurs (crashOnStart, failHealthcheck, etc.)
  - Structure optionnelle, pas utilisée en MVP mais prête pour Phase 3
- [ ] `src/kubectl/commands/handlers/logs.ts`
  - Support `kubectl logs <pod-name>`
  - Support `kubectl logs <pod-name> -n <namespace>`
  - Flag `--tail=N` (optionnel MVP)
- [ ] `src/cluster/models/logGenerator.ts` - Pure functions
  - `generateNginxLogs()`, `generateRedisLogs()`, etc.
  - Logs dynamiques basés sur container type + phase
  - Rotation automatique (max 200 lignes/pod)
- [ ] ~15-20 tests

### Définition de Done
- `kubectl get pods` affiche tableau formaté
- `kubectl describe pod <name>` affiche détails complets
- `kubectl delete pod <name>` supprime le pod
- `kubectl apply -f <path>` crée ressource depuis fichier
- `kubectl logs <pod-name>` affiche logs simulés
- Commande `debug` pour logs applicatifs
- kubectl + filesystem intégrés
- Tests > 80% coverage

---

## 🎯 Sprint 6 : Storage + Integration + Polish (MVP)

**Objectif**: Persistance et intégration finale pour MVP production-ready

### 6.1 - Storage Adapter (TDD)
- [ ] `src/cluster/storage/adapter.ts`
  - Factory `createStorageAdapter(storageType: 'localStorage')`
  - Operations: `save(key, data)`, `load(key)`, `clear()`
  - Support ClusterState + FileSystem
- [ ] ~10-15 tests

### 6.2 - Integration (TDD)
- [ ] `src/main.ts` - Orchestration complète
  - Load ClusterState from storage (ou seed si vide)
  - Load FileSystem from storage (ou seed si vide)
  - Initialize executors (kubectl + shell)
  - Auto-save on state changes
- [ ] Tests end-to-end
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

### 6.5 - Documentation
- [ ] README à jour avec exemples
- [ ] Couverture tests > 80% globale
- [ ] ~200+ tests total

### Définition de Done (MVP Ready)
- Flow complet: créer fichier → éditer → apply → voir dans cluster
- Navigation filesystem + kubectl intégrés
- Persistance fonctionne (reload page = état préservé)
- Messages d'erreur clairs
- UI responsive et polie
- Documentation complète
- Prêt pour déploiement

---

## 🚀 Phase 2 : Enhanced Features

**Objectif**: Améliorer l'expérience utilisateur

### Priorities
1. **Terminal Syntax Highlighting** - Coloration en temps réel pendant la frappe
   - Commandes valides en vert (kubectl, ls, cd, etc.)
   - Commandes invalides/inconnues en rouge
   - Arguments/flags en couleurs différentes
   - Comme une extension IDE avec feedback visuel immédiat
   - Utiliser les capacités ANSI de xterm.js
2. **Enhanced Prompt** - Prompt dynamique et contextuel
   - Affichage du chemin courant (déjà spécifié : `~/manifests/dev>`)
   - Username/hostname personnalisable (ex: `user@k8s-sim:~/manifests$`)
   - Indicateur de contexte (namespace courant, cluster name)
   - Couleurs adaptatives (vert pour succès, rouge après erreur)
3. **Real Registry Integration** - Fetch images depuis Docker Hub API
   - Toggle "Use real registry data" dans l'UI
   - Fetch tags/metadata depuis API Docker Hub (dry-run, pas de pull)
   - Fallback sur liste hardcodée si offline/erreur
   - Rate limiting et cache intelligent
4. **Terminal-based YAML Editor** - Éditeur nano-like intégré dans xterm
5. **Enhanced Terminal Features** - Historique commandes (↑↓), autocomplétion (Tab)
6. **Additional Resources** - Deployment, Service, Namespace models
7. **Advanced kubectl** - `kubectl exec`, `kubectl scale`, `kubectl rollout`
8. **Chaos Hooks & Flags** - Préparer l'infrastructure pour chaos engineering (Phase 3)
   - Ajouter flags dans Pod/Deployment/Service models (`chaosConfig`)
   - Support injection d'erreurs programmables
   - Events system étendu pour tracking anomalies
   - Base pour disaster recovery scenarios (GUI en Phase 3)

**Estimé**: 6-7 sprints additionnels après MVP

---

## 🎓 Phase 3 : Learning Platform

**Objectif**: Transformer le simulateur en plateforme d'apprentissage interactive

### Chaos Engineering System (Sprint 7)
- **GUI Interface** : Panneau dédié pour disaster recovery training
  - Toggle enable/disable chaos mode
  - Sélection de targets (pods, images, services)
  - Création de scénarios personnalisés
  - Execute/Reset buttons
  - Visualisation temps réel de l'état du chaos
- **Scenarios prédéfinis** : ImagePullBackOff, CrashLoopBackOff, NetworkFailure
- **Custom scenarios** : Utilisateur crée ses propres plans de panique
- **Scheduler** : Exécution automatique de chaos à des moments précis
- **Integration avec Challenges** : Utiliser chaos dans les exercices

### Challenges System (Sprint 8)
- Seed clusters pré-configurés avec problèmes
- Validation automatique des solutions
- Hints progressifs
- 3+ scenarios (debugging, scaling, networking)

### Lessons System (Sprint 9)
- Tutoriels interactifs guidés
- Split-view: théorie + pratique
- Exercices validables
- Progress tracking

### Cluster Visualizer (Sprint 10)
- Visualisation graphique de l'état du cluster
- Tree view / Cards grid / Graph view
- Sync temps réel avec terminal

### Integration & Polish (Sprint 11-12)
- Layout manager (modes: terminal, learning, challenge, visual)
- Gamification & achievements
- Responsive layouts
- Accessibility

**Estimé**: 6-7 sprints additionnels après Phase 2

---

## 🔄 Workflow TDD

Pour chaque feature:
1. **RED** : Écrire le test (qui échoue)
2. **GREEN** : Implémenter le minimum pour passer le test
3. **REFACTOR** : Nettoyer le code
4. **COMMIT** : Commit avec message clair
5. **REPEAT** : Feature suivante

### Commandes utiles
```bash
npm run dev        # Lancer le dev server
npm test           # Lancer tous les tests
npm run coverage   # Coverage report
npm run build      # Build production
```

---

## 📐 Architecture Patterns

**Établis et validés**:
- Factory functions pour injection de dépendances via closures
- Pure functions pour logique métier (testabilité maximale)
- Discriminated unions pour error handling (pas d'exceptions)
- Immutabilité complète (Object.freeze)
- Types TypeScript stricts
- Conventions de commentaires structurels (2-3 niveaux) pour organisation visuelle du code

**À appliquer pour tous les nouveaux modules**.
