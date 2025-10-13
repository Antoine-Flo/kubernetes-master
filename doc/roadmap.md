# 🗺️ Roadmap - Simulateur kubectl

## 📊 État actuel du projet

**107 tests passent** | **Coverage: 86.96%** | **Architecture: Functional (Factory + Pure functions)**

### ✅ Completé
- **Sprint 1**: Terminal xterm.js fonctionnel (9 tests)
- **Sprint 2**: Pod model + ClusterState (43 tests)
- **Sprint 3.1**: Parser kubectl avec aliases (33 tests)
- **Sprint 3.2**: Executor avec routing (24 tests)

### 🎯 Prochaine étape
**Sprint 3.3 - Terminal Integration**

### 📋 À venir
- Sprint 4: FileSystem + Shell Commands
- Sprint 5: kubectl Handlers + Formatters
- Sprint 6: Storage + Integration (MVP)
- Phase 2: Enhanced Features
- Phase 3: Learning Platform

---

## 🎯 Sprint 3.3 : Integration avec Terminal

**Objectif**: Connecter le parser/executor au terminal pour un flow end-to-end

### Tâches
- [ ] Connecter parser/executor au TerminalManager
- [ ] Dispatcher: router kubectl vs shell commands (préparation Sprint 4)
- [ ] Test end-to-end: saisir commande → parser → executor → output dans terminal
- [ ] ~5-8 tests

### Définition de Done
- Commande `kubectl get pods` fonctionne dans le terminal
- Output s'affiche correctement
- Erreurs remontées au terminal
- Flow complet validé

---

## 🎯 Sprint 4 : FileSystem + Shell Commands

**Objectif**: Système de fichiers virtuel et commandes shell de base

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
- [ ] `src/shell/commands/parser.ts` - Parse: cd, ls, pwd, mkdir, touch, cat, rm, clear, help
- [ ] `src/shell/commands/executor.ts` - Factory `createShellExecutor(fileSystem)`
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

### Définition de Done
- FileSystem fonctionne (création/navigation/lecture)
- Commandes shell de base implémentées
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

### Définition de Done
- `kubectl get pods` affiche tableau formaté
- `kubectl describe pod <name>` affiche détails complets
- `kubectl delete pod <name>` supprime le pod
- `kubectl apply -f <path>` crée ressource depuis fichier
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
1. **Terminal-based YAML Editor** - Éditeur nano-like intégré dans xterm
2. **Additional Resources** - Deployment, Service, Namespace models
3. **Enhanced Terminal** - Historique commandes (↑↓), autocomplétion (Tab)
4. **Advanced kubectl** - `kubectl logs`, `kubectl exec`, `kubectl scale`

**Estimé**: 3-4 sprints additionnels après MVP

---

## 🎓 Phase 3 : Learning Platform

**Objectif**: Transformer le simulateur en plateforme d'apprentissage interactive

### Challenges System (Sprint 7)
- Seed clusters pré-configurés avec problèmes
- Validation automatique des solutions
- Hints progressifs
- 3+ scenarios (debugging, scaling, networking)

### Lessons System (Sprint 8)
- Tutoriels interactifs guidés
- Split-view: théorie + pratique
- Exercices validables
- Progress tracking

### Cluster Visualizer (Sprint 9)
- Visualisation graphique de l'état du cluster
- Tree view / Cards grid / Graph view
- Sync temps réel avec terminal

### Integration & Polish (Sprint 10-11)
- Layout manager (modes: terminal, learning, challenge, visual)
- Gamification & achievements
- Responsive layouts
- Accessibility

**Estimé**: 5-6 sprints additionnels après MVP

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

**À appliquer pour tous les nouveaux modules**.
