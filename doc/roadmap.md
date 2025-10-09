# 🗺️ Roadmap - Simulateur kubectl

## 📊 État actuel du projet

### ✅ Déjà configuré
- [x] Vite + build setup
- [x] TypeScript avec strict mode
- [x] Tailwind CSS 4 + DaisyUI
- [x] Vitest installé
- [x] Scripts npm (dev, build, test, preview)
- [x] .gitignore configuré

### ✅ Nouvellement configuré
- [x] Installation @xterm/xterm
- [x] Configuration Vitest (vitest.config.ts)
- [x] Test exemple validé (tests/example.test.ts)
- [x] Nettoyage des fichiers boilerplate Vite

### ✅ Sprint 1 - Terminé
- [x] Structure des dossiers src/ (feature-based: kubectl/cluster/terminal)
- [x] Configuration thème dark DaisyUI + Tailwind
- [x] HTML + CSS pour le terminal
- [x] TerminalManager avec TDD (7 tests passent)
- [x] Intégration dans main.ts
- [x] jsdom + mocks pour tests
- [x] Refactoring en programmation fonctionnelle (factory function + closures)
- [x] Amélioration UX terminal (focus auto, prompt correct)

### ❌ À faire
- [ ] Implémentation du core (Sprint 2+)

---

## 🎯 Sprint 1 : Foundation (Setup Terminal) ✅ TERMINÉ

### Objectif
Terminal xterm.js fonctionnel, centré, avec thème dark et saisie basique

### Tâches

#### 1.1 - Dépendances manquantes ✅
- [x] `npm install @xterm/xterm`
- [x] `npm install --save-dev jsdom`
- [x] Vérifier que `@types/node` n'est pas nécessaire (web only)

#### 1.2 - Configuration Vitest ✅
- [x] Créer `vitest.config.ts` avec config
- [x] Environment jsdom
- [x] Setup file pour mocks (matchMedia, ResizeObserver)
- [x] Créer un test exemple pour valider le setup (`tests/example.test.ts`)
- [x] Tests passent (2/2 ✓)

#### 1.3 - Nettoyage boilerplate ✅
- [x] Supprimer `src/counter.ts`
- [x] Supprimer `src/typescript.svg`
- [x] Supprimer `public/vite.svg`
- [x] Nettoyer `src/main.ts`

#### 1.4 - Structure des dossiers ✅
```
src/
├── kubectl/           # Feature: kubectl command simulation
│   ├── commands/
│   │   └── handlers/
│   └── formatters/
├── cluster/           # Feature: K8s cluster state
│   ├── models/
│   └── storage/
├── terminal/          # Feature: Terminal UI
│   └── TerminalManager.ts
└── main.ts
tests/
└── unit/
    ├── terminal/
    │   └── TerminalManager.test.ts
    ├── kubectl/
    └── cluster/
```

#### 1.5 - HTML + CSS Terminal ✅
- [x] Modifier `index.html` : Tailwind utility classes
- [x] Pas de CSS BEM (utilisation de Tailwind/daisyUI)
- [x] Configurer thème dark dans HTML (data-theme="dark")
- [x] Centrer le terminal (flexbox)
- [x] Import xterm.css dans style.css

#### 1.6 - TerminalManager (TDD) ✅
- [x] Créer `tests/unit/terminal/TerminalManager.test.ts` (7 tests)
- [x] Créer `src/terminal/TerminalManager.ts` (functional style)
  - Factory function `createTerminalManager()` au lieu de classe
  - Closures pour encapsuler l'état (currentLine, commandCallback)
  - Initialiser xterm
  - Gérer le prompt `kubectl> `
  - Capturer les inputs character-by-character
  - Émettre les commandes saisies
  - Handle backspace
  - Handle Enter key
- [x] Tous les tests passent (9/9)

#### 1.7 - Intégration dans main.ts ✅
- [x] Instancier TerminalManager
- [x] Connecter au DOM
- [x] Afficher message de bienvenue
- [x] Logger les commandes en console

#### 1.8 - Refactoring Functional Programming ✅
- [x] Convertir TerminalManager de classe à factory function
- [x] Utiliser closures pour l'état privé (pas de `this`)
- [x] API publique retournée comme objet avec fonctions
- [x] Tous les tests adaptés et passent

#### 1.9 - Améliorations UX Terminal ✅
- [x] Prompt affiché après message de bienvenue (pas avant)
- [x] Focus automatique sur le terminal au chargement
- [x] Correction saut de ligne en trop
- [x] API publique étendue (showPrompt, focus)
- [x] Configuration terminal améliorée (scrollback: 1000, rows: 24)

**Définition de Done Sprint 1:** ✅
- [x] Terminal visible, centré, thème dark
- [x] Peut saisir du texte
- [x] Affiche un prompt `kubectl> `
- [x] Prompt affiché au bon moment avec cursor positionné
- [x] Presse Entrée → détecte la commande
- [x] Tests passent (`npm test` - 9/9)
- [x] Code en programmation fonctionnelle (factory functions, pas de classes)
- [x] Focus automatique et UX optimale

---

## 🎯 Sprint 2 : Cluster State + Models

### Objectif
Modèle de données du cluster avec données seed et persistance

### Tâches

#### 2.1 - Models Kubernetes (TDD)
- [ ] `tests/unit/cluster/models/Pod.test.ts`
- [ ] `src/cluster/models/Pod.ts`
  - Interface Pod (selon spec.md)
  - Factory function `createPod()` (functional)
  - Validation basique
- [ ] Répéter pour `Deployment.ts`
- [ ] Répéter pour `Service.ts`
- [ ] Répéter pour `Namespace.ts`

#### 2.2 - ClusterState (TDD)
- [ ] `tests/unit/cluster/ClusterState.test.ts`
- [ ] `src/cluster/ClusterState.ts`
  - Interface ClusterState
  - Factory function `createClusterState()` (functional, pas de classe)
  - Fonctions pures pour CRUD: `addPod()`, `removePod()`, `getPod(name, namespace)`
  - Fonctions `addDeployment()`, etc.
  - Fonctions `toJSON()` / `fromJSON()` pour sérialisation
  - Utiliser closures ou retourner nouvel état (immutabilité)

#### 2.3 - Seed Data
- [ ] `src/cluster/seedCluster.ts`
  - Fonction pure `createSeedCluster(): ClusterState`
  - Namespaces: default, kube-system
  - 3-4 Pods (nginx, redis, postgres dans default)
  - 1-2 Deployments
  - 1-2 Services
- [ ] Tests pour vérifier la cohérence des données seed

#### 2.4 - StorageAdapter (TDD)
- [ ] `tests/unit/cluster/storage/StorageAdapter.test.ts`
- [ ] `src/cluster/storage/StorageAdapter.ts`
  - Factory function `createLocalStorageAdapter()`
  - Fonctions: save, load, clear (functional style)
  - Gestion des erreurs (quota exceeded, etc.)
- [ ] Mock localStorage pour les tests

**Définition de Done Sprint 2:**
- Modèles Pod, Deployment, Service, Namespace définis
- ClusterState peut gérer CRUD sur ces ressources
- Seed cluster génère des données initiales valides
- Persistance localStorage fonctionne
- Couverture tests > 90%

---

## 🎯 Sprint 3 : Command Parser + Executor

### Objectif
Interpréter et router les commandes kubectl basiques

### Tâches

#### 3.1 - CommandParser (TDD)
- [ ] `tests/unit/kubectl/commands/parser.test.ts`
- [ ] `src/kubectl/commands/parser.ts`
  - Fonction pure `parseCommand(input: string)`
  - Parse `kubectl get pods`
  - Parse `kubectl get pods -n namespace`
  - Parse `kubectl get deployments`
  - Parse `kubectl describe pod name`
  - Parse `kubectl delete pod name`
  - Retourne objet `{ action, resource, name?, flags? }`
  - Gestion erreurs de syntaxe

#### 3.2 - CommandExecutor (TDD)
- [ ] `tests/unit/kubectl/commands/executor.test.ts`
- [ ] `src/kubectl/commands/executor.ts`
  - Factory function `createCommandExecutor(clusterState)`
  - Fonction `execute(parsedCommand): string`
  - Route vers les handlers appropriés (map de fonctions)
  - Retourne l'output formaté
  - Gestion des erreurs (commande inconnue, etc.)

#### 3.3 - Handler Functions
- [ ] `src/kubectl/commands/handlers/` (fonctions pures)
  - Pas d'interface/classe, juste des fonctions
  - Type pour les params: `HandlerParams`
  - Chaque handler: `(state, params) => string`

**Définition de Done Sprint 3:**
- Parser reconnaît toutes les commandes prioritaires
- Executor route correctement vers les handlers
- Tests couvrent cas nominaux + erreurs
- Commandes invalides → messages d'erreur clairs

---

## 🎯 Sprint 4 : Get Handlers + Output Formatting

### Objectif
Implémenter `kubectl get` avec formatage tableau

### Tâches

#### 4.1 - OutputFormatter / TableFormatter (TDD)
- [ ] `tests/unit/kubectl/formatters/table-formatter.test.ts`
- [ ] `src/kubectl/formatters/table-formatter.ts`
  - Fonction pure `formatTable(headers, rows): string`
  - Calcul largeur colonnes (fonctions utilitaires)
  - Alignement
  - Format ASCII art (comme kubectl)
  - Support couleurs ANSI (optionnel phase 1)

#### 4.2 - GetPodsHandler (TDD)
- [ ] `tests/unit/kubectl/commands/handlers/get.test.ts`
- [ ] `src/kubectl/commands/handlers/get.ts`
  - Fonction pure `handleGetPods(state, namespace?): string`
  - Récupère pods depuis ClusterState (immutable)
  - Filtre par namespace si fourni (filter/map)
  - Formate en tableau : NAME | READY | STATUS | RESTARTS | AGE
  - Calcul de AGE depuis creationTimestamp (fonction utilitaire)

#### 4.3 - GetDeploymentsHandler
- [ ] Handler pour `kubectl get deployments`
- [ ] Format: NAME | READY | UP-TO-DATE | AVAILABLE | AGE

#### 4.4 - GetServicesHandler
- [ ] Handler pour `kubectl get services`
- [ ] Format: NAME | TYPE | CLUSTER-IP | EXTERNAL-IP | PORT(S) | AGE

#### 4.5 - GetNamespacesHandler
- [ ] Handler pour `kubectl get namespaces`
- [ ] Format: NAME | STATUS | AGE

**Définition de Done Sprint 4:**
- `kubectl get pods` affiche tableau formaté
- `kubectl get pods -n kube-system` filtre correctement
- Tous les `get` handlers implémentés
- Output ressemble à kubectl réel
- Tests validés

---

## 🎯 Sprint 5 : Describe + Delete Handlers

### Objectif
Implémenter `kubectl describe` et `kubectl delete`

### Tâches

#### 5.1 - DescribeHandler (TDD)
- [ ] `tests/unit/core/commands/handlers/DescribeHandler.test.ts`
- [ ] `src/core/commands/handlers/DescribeHandler.ts`
  - `handleDescribePod(state, name, namespace)`
  - Format multi-lignes avec détails :
    - Name, Namespace, Labels
    - Status, IP
    - Containers (name, image, ports)
    - Events (si implémenté)
  - Erreur si pod non trouvé

#### 5.2 - DeleteHandler (TDD)
- [ ] `tests/unit/core/commands/handlers/DeleteHandler.test.ts`
- [ ] `src/core/commands/handlers/DeleteHandler.ts`
  - `handleDeletePod(state, name, namespace)`
  - Supprime du ClusterState
  - Message de confirmation : `pod "name" deleted`
  - Erreur si pod non trouvé

#### 5.3 - Intégration avec Storage
- [ ] Après delete → sauvegarder dans localStorage
- [ ] Test: delete + reload → pod toujours supprimé

**Définition de Done Sprint 5:**
- `kubectl describe pod nginx` affiche détails complets
- `kubectl delete pod nginx` supprime le pod
- Persistance fonctionne après delete
- Messages d'erreur clairs

---

## 🎯 Sprint 6 : Intégration Finale + Polish

### Objectif
Connecter tous les modules et finaliser le MVP

### Tâches

#### 6.1 - Intégration complète
- [ ] `src/main.ts` : 
  - Initialiser ClusterState (charger depuis storage ou seed)
  - Initialiser CommandParser
  - Initialiser CommandExecutor
  - Initialiser TerminalManager
  - Connecter: Terminal → Parser → Executor → Terminal output
- [ ] Tests d'intégration end-to-end

#### 6.2 - Gestion des erreurs
- [ ] Commande inconnue → message d'aide
- [ ] Ressource non trouvée → erreur claire
- [ ] Syntaxe invalide → suggestion
- [ ] Namespace inexistant → erreur

#### 6.3 - Commandes utilitaires
- [ ] `clear` → efface le terminal
- [ ] `help` → liste des commandes disponibles
- [ ] `reset` → réinitialise le cluster au seed

#### 6.4 - Polish UI
- [ ] Vérifier responsive (mobile/tablet)
- [ ] Ajuster couleurs (status: green=Running, red=Failed)
- [ ] Favicon personnalisé
- [ ] Title de la page

#### 6.5 - Documentation
- [ ] README.md avec :
  - Screenshot
  - Commandes disponibles
  - How to run
  - How to test
  - Architecture overview

#### 6.6 - Tests finaux
- [ ] Couverture globale > 80%
- [ ] Tous les tests passent
- [ ] Tester manuellement tous les flows

**Définition de Done Sprint 6:**
- Application complète fonctionne end-to-end
- Peut lister, décrire, supprimer des ressources
- Persistance fonctionne parfaitement
- UI propre et responsive
- Documentation complète
- Prêt pour déploiement

---

## 🚀 Phase 2 (Post-MVP) - Futures améliorations

### P2.1 - Enhanced Terminal
- [ ] Historique commandes (↑↓)
- [ ] Autocomplétion (Tab)
- [ ] Ctrl+C pour annuler

### P2.2 - YAML Support
- [ ] Parser YAML (js-yaml ou custom)
- [ ] `kubectl create -f pod.yaml`
- [ ] `kubectl apply -f deployment.yaml`
- [ ] Éditeur YAML inline ?

### P2.3 - Dynamic Controllers
- [ ] DeploymentController → crée/supprime pods
- [ ] ReplicaSet support
- [ ] Pod restart simulation
- [ ] Events logging

### P2.4 - Advanced Features
- [ ] `kubectl logs pod-name`
- [ ] `kubectl exec -it pod-name -- /bin/bash` (shell simulé)
- [ ] `kubectl port-forward`
- [ ] Node simulation

### P2.5 - Learning Mode
- [ ] Challenges guidés
- [ ] Scenarios (debug un pod crashé, scale un deployment)
- [ ] Achievements/badges
- [ ] Tips contextuels

### P2.6 - UI Enhancement
- [ ] Sidebar avec vue graphique du cluster
- [ ] Graphes de métriques simulées
- [ ] Dark/Light theme toggle
- [ ] Export/import cluster state

---

## 📈 Métriques de succès

### Sprint 1
- [ ] Terminal s'affiche correctement
- [ ] Tests passent
- [ ] ~200 lignes de code

### Sprint 2
- [ ] Couverture tests > 90%
- [ ] Seed cluster a 10+ ressources

### Sprint 3-4
- [ ] 4+ commandes fonctionnelles
- [ ] Output formaté proprement

### Sprint 5-6
- [ ] MVP complet utilisable
- [ ] Documentation existe
- [ ] Déployable

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

### À faire immédiatement (Sprint 1)
1. Installer @xterm/xterm
2. Configurer vitest dans vite.config.js
3. Créer la structure des dossiers
4. Nettoyer le boilerplate
5. Implémenter TerminalManager (TDD)

### Questions en suspens
- [ ] Couleurs ANSI dans terminal (phase 1 ou 2?)
- [ ] Format de date pour AGE (relative comme kubectl?)
- [ ] Support de `kubectl get all` en phase 1?


