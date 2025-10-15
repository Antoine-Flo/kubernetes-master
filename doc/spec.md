# Spécification - Kube Simulator

## 🎯 Vue d'ensemble

Application web interactive permettant de s'entraîner aux commandes `kubectl` via un terminal simulé, avec un cluster Kubernetes virtuel stateful.

### Commandes utiles
```bash
npm test           # Lancer tous les tests
npm run coverage   # Coverage report
```

---

## 📋 Objectifs principaux

### Phase 1 : MVP (Minimum Viable Product)
- Terminal xterm.js centré et stylé
- Interpréteur de commandes kubectl basique (`get`, `describe`, `delete`, `create`, `apply`)
- Cluster virtuel stateful en mémoire (namespaces, pods, deployments, services)
- Persistance locale (localStorage/IndexedDB)
- Support des ressources de base : Pods, Deployments, Services, Namespaces

### Phase 2 : Évolution (Future)
- Simulation de contrôleurs Kubernetes (reconciliation loops)
- Génération dynamique de ressources
- Simulation de pannes et redémarrages
- Métriques et logs simulés
- Scenarios d'entraînement guidés

### Phase 3 : Learning Platform (Long-term)
- **Challenges System** : Scenarios avec seed clusters pré-configurés
- **Lessons UI** : Interface pédagogique avec texte, explications, progression
- **Visual Cluster** : Représentation graphique de l'état du cluster

---

## 🏗️ Architecture technique

### Stack technologique
- **Frontend** : HTML5, TypeScript, CSS (BEM)
- **Terminal** : xterm.js
- **Build** : Vite
- **UI Framework** : daisyUI
- **Tests** : Vitest
- **Persistance** : localStorage (Phase 1), IndexedDB (Phase 2+)

### Principes architecturaux
- **KISS** : Keep It Simple, Stupid
- **DRY** : Don't Repeat Yourself
- **Functional Programming** : Factory functions + Pure functions (pas de classes)
- **Indentation max** : 3 niveaux
- **Pas de switch** : Utiliser object lookup ou if/else
- **Library-First Design** : Modules génériques réutilisables

### Patterns techniques essentiels

#### 1. Result Types (Error Handling)

**Pattern Unix-like** : Success = stdout, Error = stderr

```typescript
// src/shared/result.ts - Centralisé pour tout le projet
export type Result<T> = 
    | { type: 'success'; data: T }
    | { type: 'error'; message: string }

export type ExecutionResult = Result<string>  // Pour commandes

// Helpers
export const success = <T>(data: T): Result<T> => ({ type: 'success', data })
export const error = (message: string): Result<never> => ({ type: 'error', message })
```

**Usage**:
```typescript
import { success, error } from '../../shared/result'

// Au lieu de: return { type: 'success', data: value }
return success(value)

// Au lieu de: return { type: 'error', message: 'error' }
return error('error message')
```

#### 2. Factory Functions (State Management)

**Pattern** : Closure pour encapsuler l'état mutable

```typescript
export const createSomething = (initialState?: State) => {
    let state = initialState || defaultState
    
    return {
        method1: () => { /* use/modify state */ },
        method2: () => { /* use/modify state */ },
        toJSON: () => ({ ...state })
    }
}
```

#### 3. Pure Functions (Business Logic)

**Pattern** : Fonctions sans side-effects pour logique métier

```typescript
// ✅ Pure - testable, prévisible
export const calculateAge = (timestamp: string): string => {
    const now = new Date()
    const created = new Date(timestamp)
    const diffMs = now.getTime() - created.getTime()
    return `${Math.floor(diffMs / 60000)}m`
}

// ❌ Impure - side effects
const updateGlobalState = (value) => { globalVar = value }
```

#### 4. Command Pattern

**Pattern** : Object lookup au lieu de if/switch chains

```typescript
const HANDLERS: Record<string, HandlerFn> = {
    get: (args) => handleGet(args),
    describe: (args) => handleDescribe(args),
    delete: (args) => handleDelete(args),
}

const handler = HANDLERS[command]
if (!handler) return error(`Unknown command: ${command}`)
return handler(args)
```

### Conventions de commentaires

**2 types** :
1. **Structurels** : Header de fichier + sous-sections si >8 fonctions
2. **Explicatifs** : Pourquoi, comportements K8s, décisions non-évidentes

**Règle simple** : Commenter le pourquoi, pas le quoi

#### Commentaires structurels (Organisation)

**Format standard** :

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// SHELL COMMAND PARSER
// ═══════════════════════════════════════════════════════════════════════════
// Parses shell command strings into structured objects with args and flags.
// Validates commands against allowed list and extracts boolean/value flags.

const VALID_COMMANDS = [...]

export const parseShellCommand = (...) => { ... }
const extractCommand = (...) => { ... }
```

**Format avec ASCII art (fichiers centraux uniquement)** :

```typescript
// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                      KUBERNETES CLUSTER STATE                         ║
// ╚═══════════════════════════════════════════════════════════════════════╝
// Manages virtual K8s cluster with pods, deployments, services.
// State mutations return discriminated unions for type-safe error handling.

export const createClusterState = (...) => { ... }
```

**Sous-sections (optionnel, seulement si >8 fonctions)** :

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// FILESYSTEM STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
// Virtual filesystem with tree structure and closure-based state.
// Supports navigation, file/directory operations with max depth validation.

// ─── Path Operations ─────────────────────────────────────────────────────

export const resolvePath = (...) => { ... }
export const getDepth = (...) => { ... }

// ─── Tree Traversal ──────────────────────────────────────────────────────

export const findNode = (...) => { ... }
export const insertNode = (...) => { ... }
```

**Règles d'usage** :
- **1 commentaire principal par fichier** avec contexte (2-3 lignes sous le délimiteur)
- **Sous-sections sans commentaire** (juste le titre décoratif)
- **ASCII art** uniquement pour 3-4 fichiers vraiment centraux (ClusterState, FileSystem, main.ts)
- **Titres descriptifs** : "Path Resolution & Validation" (pas "Helper Functions" ou "Utilities")
- **Position** : Toujours au niveau root (colonne 0)
- **Éviter** : Un titre par fonction, titres vides de sens

#### Règles pour les commentaires explicatifs

1. **✅ JSDoc pour les exports publics**
   ```typescript
   /**
    * Parse kubectl command string into structured object
    * @param input - Raw command (e.g., "kubectl get pods -n default")
    * @returns Parsed command or error
    */
   export const parseCommand = (input: string): ParseResult => { /* ... */ }
   ```

2. **✅ Expliquer les comportements Kubernetes**
   ```typescript
   // Kubernetes behavior: Pods default to 'default' namespace when unspecified
   const namespace = parsed.namespace || 'default'
   ```

3. **✅ Documenter les contraintes de la spec**
   ```typescript
   // Max depth 3 prevents filesystem over-complexity (spec requirement)
   if (getDepth(path) > 3) {
       return error
   }
   ```

4. **✅ Clarifier les edge cases**
   ```typescript
   // Cannot go above root - stay at root level
   if (parts.length === 0 && part === '..') {
       continue
   }
   ```

5. **✅ Signaler les side effects**
   ```typescript
   // Side effect: Mutates parent.children Map
   parent.children.set(name, node)
   ```

6. **✅ TODOs avec phase et contexte**
   ```typescript
   // TODO(Phase 2): Implement truly immutable tree with structural sharing
   ```

7. **❌ Jamais de code commenté** : Utiliser git pour l'historique

8. **❌ Pas de séparateurs indentés** : Les commentaires de section restent toujours en colonne 0

### Structure des modules

```
src/
├── kubectl/                       # Feature: kubectl simulation
│   ├── commands/
│   │   ├── parser.ts              # Parse les commandes kubectl (fonction pure)
│   │   ├── executor.ts            # Exécute les commandes (factory function)
│   │   └── handlers/              # Handlers par commande (fonctions pures)
│   │       ├── get.ts
│   │       ├── describe.ts
│   │       ├── delete.ts
│   │       ├── create.ts
│   │       ├── apply.ts
│   │       └── logs.ts
│   └── formatters/
│       └── table-formatter.ts     # Format output en tables (fonction pure)
├── cluster/                       # Feature: cluster K8s
│   ├── ClusterState.ts            # État du cluster (factory function)
│   ├── models/                    # Modèles de ressources K8s
│   │   ├── Pod.ts                 # Factory functions
│   │   ├── Deployment.ts
│   │   ├── Service.ts
│   │   ├── Namespace.ts
│   │   └── logGenerator.ts        # Génération logs containers (pure functions)
│   ├── registry/                  # Image registry simulation
│   │   └── ImageRegistry.ts       # Registry avec validation stricte
│   ├── controllers/
│   │   └── ImagePuller.ts         # Pull simulation avec events
│   ├── seedCluster.ts             # Données initiales (fonction pure)
│   └── storage/
│       └── adapter.ts             # Abstraction persistance (factory function)
├── filesystem/                    # Feature: Virtual file system (Phase 1)
│   ├── FileSystem.ts              # État du filesystem (factory function)
│   ├── models/
│   │   ├── File.ts                # Factory pour fichiers (YAML manifests)
│   │   └── Directory.ts           # Factory pour dossiers
│   └── seedFileSystem.ts          # Filesystem initial (root + exemples)
├── logger/                        # Feature: Logging system (Phase 1)
│   └── Logger.ts                  # Application logger (factory function)
├── shell/                         # Feature: Shell commands (Phase 1)
│   ├── commands/
│   │   ├── parser.ts              # Parse commandes shell (cd, ls, mkdir, etc.)
│   │   ├── executor.ts            # Exécute commandes shell
│   │   └── handlers/              # Handlers par commande (fonctions pures)
│   │       ├── cd.ts
│   │       ├── ls.ts
│   │       ├── pwd.ts
│   │       ├── mkdir.ts
│   │       ├── touch.ts
│   │       ├── cat.ts
│   │       ├── rm.ts
│   │       └── debug.ts
│   └── formatters/
│       └── ls-formatter.ts        # Format output de ls
├── editor/                        # Feature: Terminal-based YAML editor (Phase 2)
│   └── TerminalEditor.ts          # Éditeur dans xterm (nano-like)
├── terminal/
│   └── TerminalManager.ts         # Gestion xterm.js (factory function)
├── learning/                      # Feature: Learning platform (Phase 3)
│   ├── challenges/
│   │   ├── Challenge.ts           # Types et factory pour challenges
│   │   ├── scenarios/             # Seed clusters pré-configurés par scénario
│   │   │   ├── debugCrashingPod.ts
│   │   │   ├── scalingDeployment.ts
│   │   │   └── networkingIssue.ts
│   │   └── validator.ts           # Validation des solutions (fonctions pures)
│   ├── lessons/
│   │   ├── Lesson.ts              # Types et factory pour lessons
│   │   ├── content/               # Contenu des leçons (markdown ou JSON)
│   │   │   ├── intro-pods.ts
│   │   │   ├── deployments.ts
│   │   │   └── services.ts
│   │   └── LessonUI.ts            # Composant UI pour afficher leçons
│   └── visualizer/                # Visualisation du cluster (Phase 3)
│       ├── ClusterVisualizer.ts   # Factory pour le visualizer
│       └── renderers/             # Renderers pour différentes vues
│           ├── graph.ts           # Vue graphe (nodes/pods)
│           └── tree.ts            # Vue arbre (namespace > deployment > pods)
└── main.ts                        # Point d'entrée
```

---

## 💾 Modèle de données

### État du cluster (ClusterState)

```typescript
interface ClusterState {
  namespaces: Namespace[]
  pods: Pod[]
  deployments: Deployment[]
  services: Service[]
  replicaSets?: ReplicaSet[]  // Phase 2
  events?: Event[]            // Phase 2
}
```

### État du filesystem (FileSystem)

```typescript
interface FileSystemState {
  currentPath: string         // Chemin courant (e.g., "/manifests/dev")
  tree: DirectoryNode         // Arbre du filesystem (racine)
}

interface DirectoryNode {
  type: "directory"
  name: string
  path: string                // Chemin absolu
  children: Map<string, FileSystemNode>
}

interface FileNode {
  type: "file"
  name: string
  path: string                // Chemin absolu
  content: string             // Contenu du fichier (YAML)
  createdAt: string
  modifiedAt: string
}

type FileSystemNode = DirectoryNode | FileNode
```

Voir `src/filesystem/models/` pour l'implémentation des factory functions.

### Contraintes du filesystem

- **Profondeur maximale** : 3 niveaux (racine + 3)
  - Exemple valide : `/manifests/dev/pods/nginx.yaml` (profondeur 3)
  - Exemple invalide : `/a/b/c/d/file.yaml` (profondeur 4)
- **Noms de fichiers** : alphanumérique + `-_./`
- **Extensions** : `.yaml`, `.yml`, `.json`, `.kyaml` supported (extensible for future formats)
- **Caractères interdits** : `*`, `?`, `<`, `>`, `|`, espaces
- **Chemins** : Format Unix (`/path/to/file`)
- **Racine** : Toujours `/` (home directory virtuel)

### Ressources Kubernetes

Voir `src/cluster/models/Pod.ts` pour l'implémentation complète.

**Principes** :
- Factory functions pour créer les ressources
- Interfaces TypeScript strictes
- Chaos hooks optionnels (Phase 3)

---

## 🐳 Image Registry et Pull Simulation

Le simulateur implémente un registry d'images container avec validation stricte et simulation du processus de pull, pour reproduire fidèlement le comportement de Kubernetes.

### Architecture du Registry

```typescript
interface ImageManifest {
  name: string              // "nginx", "redis", etc.
  registry: string          // "docker.io/library", "myregistry.io"
  tags: string[]            // ["latest", "1.25", "1.21"]
  description: string       // Pour l'UI registry panel
  defaultPorts: number[]    // Ports par défaut du container
  
  // Comportement de l'image
  behavior: {
    startupTime: number     // ms de simulation pour le pull
    logGenerator: (pod: Pod) => LogEntry[]
    defaultStatus: PodPhase // "Running", "CrashLoopBackOff", etc.
  }
}
```

### Liste des images disponibles (MVP)

Le registry contient une **liste fixe** d'images validées :

| Image | Registry | Tags | Description | Status |
|-------|----------|------|-------------|--------|
| `nginx` | docker.io/library | latest, 1.25, 1.21 | HTTP server | Running |
| `redis` | docker.io/library | latest, 7.0, 6.2 | Data store | Running |
| `postgres` | docker.io/library | latest, 15, 14 | SQL database | Running |
| `mysql` | docker.io/library | latest, 8.0 | SQL database | Running |
| `busybox` | docker.io/library | latest | Minimal image | Succeeded |
| `broken-app` | myregistry.io | v1.0 | App qui crash (training) | CrashLoopBackOff |
| `private-image` | private.registry.io | latest | Simule auth failure | ImagePullBackOff |

### Format des images

Format standard : `[registry/]name[:tag]`

**Exemples valides** :
- `nginx` → résolu comme `docker.io/library/nginx:latest`
- `nginx:1.25` → résolu comme `docker.io/library/nginx:1.25`
- `myregistry.io/broken-app:v1.0` → image complète

**Validation stricte** :
- Image inconnue → Rejet avec message clair
- Tag inexistant → Erreur avec liste des tags disponibles
- Format invalide → Erreur de parsing

### Simulation du Pull (Phase 1 - Sprint 4.5)

Pure function qui simule le pull et retourne :
- Success → Events normaux + logs générés
- Error → ImagePullBackOff si image inconnue

Voir roadmap Sprint 4.5 pour détails d'implémentation.

### UI Registry Panel

Interface visuelle **en dehors du terminal** pour voir les images disponibles :

```
┌─────────────────────────────────────────┐
│ 🐳 Container Registry                   │
├─────────────────────────────────────────┤
│                                         │
│ docker.io/library/nginx                 │
│ High-performance HTTP server            │
│ Tags: latest | 1.25 | 1.21              │
│ Ports: 80, 443                          │
│                                         │
│ docker.io/library/redis                 │
│ In-memory data store                    │
│ Tags: latest | 7.0 | 6.2                │
│ Ports: 6379                             │
│                                         │
│ [... autres images ...]                 │
│                                         │
│ myregistry.io/broken-app (⚠️ Training)  │
│ Intentionally broken for debugging      │
│ Tags: v1.0                              │
│ Status: Will crash on start             │
└─────────────────────────────────────────┘
```

### Commande debug images

Pour lister les images disponibles depuis le terminal :

```bash
kubectl> debug images
=== Available Container Images ===

docker.io/library/nginx
  Tags: latest, 1.25, 1.21
  Ports: 80, 443
  Status: Running

docker.io/library/redis
  Tags: latest, 7.0, 6.2
  Ports: 6379
  Status: Running

[... autres images ...]

Use these images in your pod manifests.
```

### Gestion des erreurs

**Image inconnue** :
```bash
kubectl> kubectl apply -f pod.yaml
Error: Failed to pull image "unknown-image:latest"
Image not found in registry.

Run 'debug images' to see available images.
```

**Tag inexistant** :
```bash
kubectl> kubectl apply -f pod.yaml
Error: Failed to pull image "nginx:9.99"
Tag '9.99' not found for nginx

Available tags: latest, 1.25, 1.21
```

### Real Registry Integration (Phase 2)

**Objectif** : Fetch images depuis Docker Hub API pour plus de réalisme

Au lieu d'une liste fixe hardcodée, le simulateur pourra optionnellement récupérer les métadonnées réelles depuis Docker Hub :

```typescript
// Exemple d'API call (dry-run, pas de pull)
const fetchImageTags = async (imageName: string) => {
  const response = await fetch(
    `https://hub.docker.com/v2/repositories/library/${imageName}/tags`
  )
  const data = await response.json()
  return data.results.map(tag => tag.name)
}
```

**Fonctionnalités** :
- Toggle dans l'UI : "Use real registry data"
- Fetch tags et metadata depuis API Docker Hub
- Fallback automatique sur liste hardcodée si offline/erreur
- Cache intelligent pour limiter les requêtes (rate limiting)
- Supporte registries publics (Docker Hub, ghcr.io)

**Avantages** :
- Images et tags toujours à jour
- Plus proche de la réalité Kubernetes
- Permet d'utiliser n'importe quelle image publique

**Considérations** :
- Dépendance réseau
- Rate limiting Docker Hub (100 req/6h sans auth)
- Gestion erreurs réseau
- Mode offline-first (MVP hardcodé reste le défaut)

---

## 📊 Système de Logging

Le simulateur implémente deux types de logs distincts pour reproduire le comportement de Kubernetes et faciliter le debugging.

### Logs simulés (kubectl logs)

Les logs des containers sont stockés directement dans les Pods, comme dans Kubernetes réel.

```typescript
interface LogEntry {
  timestamp: string
  stream: "stdout" | "stderr"
  message: string
}

interface Pod {
  // ... existing fields
  status: {
    phase: "Running" | "Pending" | "Succeeded" | "Failed" | "Unknown"
    restartCount: number
    containerStatuses?: ContainerStatus[]
    logs: LogEntry[]  // Logs simulés
  }
}
```

**Caractéristiques** :
- **Génération dynamique** : Les logs sont générés en fonction du type de container (nginx, redis, etc.)
- **Rotation automatique** : Maximum 200 lignes par pod (FIFO)
- **Réalisme** : Format et contenu similaires aux vrais containers
- **Persistance** : Sauvegardés avec le ClusterState dans localStorage

**Implémentation** : Pure functions par type de container (nginx, redis, etc.) - Voir Sprint 5.6

### Logs applicatifs (debug)

Système de logging pour tracer les opérations internes du simulateur, accessible via la commande `debug`.

```typescript
type LogLevel = "info" | "warn" | "error" | "debug"

interface ApplicationLogEntry {
  timestamp: string
  level: LogLevel
  category: "COMMAND" | "EXECUTOR" | "FILESYSTEM" | "CLUSTER"
  message: string
}
```

**Caractéristiques** :
- **In-memory** : Stockage en mémoire uniquement (pas de persistance)
- **Rotation** : Maximum 500 entrées (FIFO)
- **Dev mirror** : Logs également visibles dans la console navigateur en mode dev
- **Accessible** : Via commande `debug` dans le terminal

**Implémentation** : Factory function avec closure (Sprint 4.7 - voir roadmap)

**Exemple d'utilisation** :

```bash
kubectl> kubectl get pods
NAME       STATUS    RESTARTS   AGE
nginx-1    Running   0          2m

kubectl> debug
=== Application Logs (last 50 entries) ===
[2025-10-13 10:23:01] [COMMAND] kubectl get pods
[2025-10-13 10:23:01] [EXECUTOR] Routing to get handler
[2025-10-13 10:23:01] [CLUSTER] Found 1 pods in default namespace
[2025-10-13 10:23:05] [COMMAND] debug

kubectl> debug clear
Logs cleared.
```

---

## 🎮 Fonctionnalités détaillées

### Commandes kubectl supportées (Phase 1)

| Commande | Description | Priorité |
|----------|-------------|----------|
| `kubectl get pods` | Liste les pods | ⭐⭐⭐ |
| `kubectl get pods -n <namespace>` | Liste pods par namespace | ⭐⭐⭐ |
| `kubectl get deployments` | Liste les deployments | ⭐⭐⭐ |
| `kubectl get services` | Liste les services | ⭐⭐⭐ |
| `kubectl describe pod <name>` | Détails d'un pod | ⭐⭐ |
| `kubectl delete pod <name>` | Supprime un pod | ⭐⭐⭐ |
| `kubectl create -f <yaml>` | Crée une ressource | ⭐⭐ |
| `kubectl apply -f <yaml>` | Applique une ressource | ⭐⭐ |
| `kubectl get all` | Liste toutes les ressources | ⭐ |
| `kubectl get namespaces` | Liste les namespaces | ⭐⭐ |
| `kubectl logs <name>` | Affiche les logs d'un pod | ⭐⭐⭐ |
| `kubectl logs <name> -n <namespace>` | Logs d'un pod par namespace | ⭐⭐ |
| `kubectl logs <name> --tail=N` | N dernières lignes de logs | ⭐ (Phase 2) |
| `kubectl edit pod <name>` | Édite un pod (ouvre éditeur) | ⭐⭐ (Phase 2) |

### Commandes shell supportées (Phase 1)

| Commande | Description | Priorité |
|----------|-------------|----------|
| `pwd` | Affiche le répertoire courant | ⭐⭐⭐ |
| `ls` | Liste fichiers/dossiers | ⭐⭐⭐ |
| `ls -l` | Liste détaillée | ⭐⭐ |
| `cd <path>` | Change de répertoire | ⭐⭐⭐ |
| `cd ..` | Remonte d'un niveau | ⭐⭐⭐ |
| `cd /` | Retourne à la racine | ⭐⭐⭐ |
| `mkdir <name>` | Crée un dossier | ⭐⭐⭐ |
| `mkdir -p <path>` | Crée dossiers récursifs (max 3 niveaux) | ⭐⭐ |
| `touch <file>` | Crée un fichier vide | ⭐⭐⭐ |
| `cat <file>` | Affiche contenu d'un fichier | ⭐⭐⭐ |
| `rm <file>` | Supprime un fichier | ⭐⭐ |
| `rm -r <dir>` | Supprime un dossier | ⭐⭐ |
| `clear` | Efface le terminal | ⭐⭐⭐ |
| `help` | Affiche l'aide | ⭐⭐⭐ |
| `debug` | Affiche logs applicatifs | ⭐⭐ |
| `debug clear` | Vide les logs | ⭐ |
| `debug export` | Exporte logs (clipboard) | ⭐ (Phase 2) |

### Intégration kubectl + filesystem

Les commandes kubectl peuvent référencer des fichiers du filesystem virtuel :

```bash
# Créer un manifest
touch pod.yaml
# Ouvrir l'éditeur pour éditer le fichier
kubectl apply -f pod.yaml

# Organisation en dossiers
mkdir -p manifests/dev
cd manifests/dev
touch nginx-pod.yaml
kubectl apply -f nginx-pod.yaml

# Référence avec chemins
kubectl apply -f /manifests/dev/nginx-pod.yaml
kubectl apply -f ../prod/redis-pod.yaml
```

### Données initiales (Seed Cluster)

Cluster pré-peuplé avec :
- Namespaces : `default`, `kube-system`
- Quelques pods exemple (nginx, redis, etc.)
- 1-2 deployments
- 1-2 services

### Données initiales (Seed FileSystem)

Filesystem pré-peuplé avec structure exemple :

```
/ (racine)
├── examples/
│   ├── pod-example.yaml        # Exemple de Pod simple
│   ├── deployment-example.yaml # Exemple de Deployment
│   └── service-example.yaml    # Exemple de Service
└── manifests/
    └── (vide - dossier pour l'utilisateur)
```

**Contenu de `/examples/pod-example.yaml`** :
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  namespace: default
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80
```

L'utilisateur peut :
- Explorer `/examples/` pour apprendre la syntaxe
- Utiliser `cat examples/pod-example.yaml` pour voir le contenu
- Créer ses propres manifests dans `/manifests/`
- Organiser ses fichiers (max 3 niveaux de profondeur)

---

## 🎨 Interface utilisateur

### Layout Phase 1 (MVP)
- Terminal centré horizontalement et verticalement
- Largeur responsive (max-width pour lisibilité)
- Theme daisyUI dark [[memory:7046767]]
- Tailwind CSS utility classes (pas de BEM)
- **Registry Panel** : Panneau latéral ou section dédiée pour lister les images disponibles
  - Affichage des images avec tags, ports, description
  - Toujours visible ou accessible via toggle

### Layout Phase 3 (Learning Platform)
- **Chaos Engineering Panel** : Interface GUI pour disaster recovery training (voir section Phase 3)
  - Toggle enable/disable chaos mode
  - Sélection de targets (pods, images)
  - Création de scénarios personnalisés avec scheduler
  - Execute/Reset buttons
  - Visualisation temps réel de l'état actif du chaos

### Prompt Terminal Dynamique (Phase 1 - MVP)

Le prompt du terminal s'adapte selon le contexte :

```bash
# À la racine
kubectl> ls

# Dans un dossier
~/manifests> pwd
/manifests

# Dans un sous-dossier (affiche chemin relatif)
~/manifests/dev> ls
```

**Format du prompt MVP** :
- Racine `/` → `kubectl> `
- Autres dossiers → `~{chemin}> ` (ex: `~/manifests/dev> `)
- Couleur : vert (success) pour cohérence avec terminaux Unix
- Après erreur : reste vert (pas de changement de couleur)

**Implémentation** :
```typescript
const getPrompt = (currentPath: string): string => {
  if (currentPath === '/') return 'kubectl> '
  return `~${currentPath}> `
}
```

### Enhanced Terminal Features (Phase 2)

#### Syntax Highlighting en temps réel

Coloration de la commande pendant la frappe, comme une extension IDE :

```bash
# Commande valide (vert)
kubectl get pods

# Commande invalide (rouge)
kubect get pods

# Avec arguments colorés
kubectl get pods -n default --watch
#       ^^^ resource (cyan)
#                  ^^ flag (jaune)
#                     ^^^^^^^ value (blanc)
```

**Implémentation** :
- Parser la ligne en temps réel pendant la frappe (`onData`)
- Validation contre liste de commandes connues (kubectl + shell)
- Application des codes ANSI de xterm.js pour coloration
- Feedback visuel immédiat (pas besoin d'exécuter)

**Palette de couleurs** :
- Commande valide : vert (`\x1b[32m`)
- Commande invalide : rouge (`\x1b[31m`)
- Resource/argument : cyan (`\x1b[36m`)
- Flag (--flag, -f) : jaune (`\x1b[33m`)
- Valeur : blanc/défaut (`\x1b[0m`)
- Chemin de fichier : bleu (`\x1b[34m`)

#### Prompt avancé et contextuel

**format** :

```bash
☸ ~/manifests> kubectl get pods
```

**Éléments du prompt** :
- **Username** : Configurable (défaut: `user`, `admin`, ou custom)
- **Hostname** : `k8s-sim`, `k8s-simulator`, ou custom
- **Current path** : Chemin relatif avec `~` (déjà implémenté en MVP)
- **Context indicator** : Namespace courant entre `[brackets]` (optionnel)
- **Symbol** : `☸` (kubernetes icon)

**Couleurs adaptatives** :
- Prompt normal : vert
- Après erreur : rouge (puis retour au vert)
- Namespace prod : rouge (warning)
- Namespace dev/staging : jaune

**Configuration utilisateur** :
```typescript
interface PromptConfig {
  format: 'minimal' | 'bash' | 'compact' | 'namespace'
  username: string
  hostname: string
  showNamespace: boolean
  showPath: boolean
  symbol: '$' | '#' | '>' | '☸'
}
```

### Layout Phase 3 (Learning Platform)
- **Layout hybride** : Terminal + Panneau latéral pédagogique
  - Terminal principal (70% largeur)
  - Panneau latéral droit (30% largeur) : Lessons, hints, objectives
- **Modes d'affichage** :
  - Mode "Terminal only" : plein écran (MVP actuel)
  - Mode "Learning" : split view avec lessons
  - Mode "Visual" : split view avec visualisation cluster
  - Mode "Challenge" : terminal + objectifs + validation
- **Components UI (daisyUI)** :
  - Cards pour les lessons
  - Accordéons pour les sections
  - Progress bars pour la progression
  - Badges pour les achievements
  - Buttons pour la navigation (Next, Previous, Try Again)

### Implémentation

Voir le code source pour les détails :
- `src/terminal/TerminalManager.ts` - Terminal avec xterm.js
- `src/filesystem/FileSystem.ts` - Filesystem avec factory + pure functions  
- `src/main.ts` - Dispatcher kubectl vs shell
- Tous suivent les patterns définis ci-dessus

---

## ✅ Tests (TDD)

### Framework de tests
- **Vitest** : Intégration native avec Vite, TypeScript support
- **jsdom** : Pour tester les interactions DOM (terminal)

### Couverture souhaitée
- **Parseur de commandes** : 100%
- **Gestionnaire de ressources** : 100%
- **Handlers de commandes** : 80%+
- **Formatage output** : 80%+

### Types de tests
- Tests unitaires pour chaque module (fonctions pures = faciles à tester)
- Tests d'intégration pour les flux complets
- Tests de snapshot pour l'output formaté (?)

### Stratégie de tests

- **Pure functions** → Tests simples, pas de setup
- **Factory functions** → Tests avec setup/teardown
- Voir `tests/` pour exemples complets

---

## ✅ Décisions techniques

### Phase 1 (MVP)
- **Framework de tests** : ✅ Vitest
- **Persistance** : ✅ localStorage (IndexedDB en Phase 2 si besoin)
- **Parser YAML/JSON** : ✅ js-yaml pour kubectl apply/create (Phase 1)
- **TypeScript** : ✅ Strict mode activé
- **Messages d'erreur** : ✅ Simplifiés mais architecture flexible
- **Terminal** : ✅ Saisie basique uniquement
- **Interface** : ✅ Terminal uniquement (pas de sidebar)
- **Thème** : ✅ Dark theme (daisyUI + xterm)
- **Commandes kubectl** : ✅ get, describe, delete, apply, create, logs
- **Commandes shell** : ✅ cd, ls, pwd, mkdir, touch, cat, rm, clear, help, debug
- **Virtual FileSystem** : ✅ Max 3 niveaux de profondeur
- **Logs simulés** : ✅ Stockés dans Pods, génération dynamique par type de container
- **Logs applicatifs** : ✅ In-memory, accessible via commande `debug`, max 500 entrées
- **Éditeur YAML** : ❌ Phase 2 (terminal-based editor dans xterm)

### Phase 2 (Enhanced Features)
- **Éditeur YAML** : Terminal-based editor (nano-like) dans xterm
  - Navigation avec flèches
  - Édition de fichiers YAML
  - Ctrl+S pour sauvegarder, Ctrl+Q pour quitter
  - Intégration avec kubectl edit
  - Pas de dépendances externes (uniquement xterm)
- Historique commandes (↑↓), autocomplétion (Tab)
- IndexedDB si localStorage insuffisant
- Messages d'erreur type kubectl réel
- Syntax highlighting ANSI dans l'éditeur (optionnel)

### Phase 3 (Learning Platform)
- Interface visuelle du cluster (sidebar/split view)
- Modes d'apprentissage guidés (lessons interactives)
- Système de challenges avec validation automatique
- Visualisation graphique de l'état du cluster

---

## 🎯 Critères de succès MVP

- Terminal fonctionnel et esthétique (centré, thème dark)
- Au moins 9 commandes kubectl supportées (get, describe, delete, apply, create, logs)
- Commandes shell basiques (cd, ls, pwd, mkdir, touch, cat, rm, debug)
- Virtual filesystem fonctionnel (max 3 niveaux, persistance)
- Cluster stateful qui persiste entre sessions (localStorage)
- Filesystem persiste entre sessions (localStorage)
- Intégration kubectl + filesystem (`kubectl apply -f path/to/file.yaml`)
- Logs simulés pour pods (génération dynamique, `kubectl logs`)
- Logs applicatifs accessibles (commande `debug`)
- Couverture de tests > 80%
- Code TypeScript strict mode
- Architecture modulaire et découplée (ClusterState + FileSystem + Logger)
- Messages d'erreur clairs et pédagogiques
- Dépendances minimales (uniquement js-yaml en plus de xterm) [[memory:7046756]]

---

## 🎓 Learning Platform (Phase 3)

### Chaos Engineering System

**Objectif** : Interface GUI pour disaster recovery training et scénarios de panique

Le système de chaos engineering permet aux utilisateurs de créer et exécuter des scénarios de panique pour s'entraîner au disaster recovery.

#### Architecture

**Chaos Hooks** (préparés dès Phase 1) :

```typescript
interface ChaosConfig {
  enabled: boolean
  scenario?: "crash" | "imagePullError" | "networkFailure" | "resourceExhaustion"
  triggerAfter?: number  // ms avant déclenchement
  customMessage?: string
}

// Dans les ressources K8s
interface Pod {
  // ... fields existants
  chaosConfig?: ChaosConfig
}
```

**GUI Interface (Phase 3)** :

```
┌─────────────────────────────────────────┐
│ ⚠️ Chaos Engineering Panel              │
├─────────────────────────────────────────┤
│                                         │
│ [x] Enable Chaos Mode                   │
│                                         │
│ Create Scenario:                        │
│ ┌─────────────────────────────────────┐ │
│ │ Disaster Recovery Training          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Select Targets:                         │
│ [ ] Break image: nginx                  │
│ [ ] Crash pod: web-server-abc123        │
│ [ ] Network failure: redis-xyz456       │
│                                         │
│ Trigger: [Immediately ▼] [After 30s ▼] │
│                                         │
│ [Execute Plan] [Reset]                  │
│                                         │
│ Active Chaos:                           │
│ • nginx → CrashLoopBackOff (active)    │
│ • web-server → Pending (scheduled)      │
└─────────────────────────────────────────┘
```

#### Fonctionnalités

- **Scenarios prédéfinis** :
  - ImagePullBackOff : Simuler échec de pull d'image
  - CrashLoopBackOff : Application qui crash au démarrage
  - NetworkFailure : Perte de connectivité réseau
  - ResourceExhaustion : OOM (Out of Memory)

- **Custom scenarios** : Créer des plans personnalisés
- **Scheduler** : Exécuter chaos immédiatement ou après délai
- **Integration Challenges** : Utiliser chaos dans les exercices
- **Reset rapide** : Restaurer état normal en un clic

**Scénarios** : CrashLoopBackOff, ImagePullBackOff, NetworkFailure, OOM (Sprint 15)

### Challenges System

**Objectif** : Scénarios pratiques où l'utilisateur doit résoudre un problème réel

#### Structure

- Seed cluster pré-configuré avec problème
- Objectifs à valider
- Hints progressifs
- Validator automatique

Détails d'implémentation : Voir roadmap Sprint 16.

**Exemples** : Debug pod, Scale deployment, Fix service, Resource cleanup (Sprint 16)

### Lessons System

**Objectif** : Tutoriels interactifs guidés avec théorie + pratique

#### Structure

- Sections : text, examples, exercises, quiz
- Validation automatique des exercices
- Progress tracking

Détails : Voir roadmap Sprint 17.

**Exemples** : Intro Pods, Deployments, Networking (Sprint 17)

### Cluster Visualizer

**Objectif** : Vue graphique de l'état du cluster pour mieux comprendre

#### Options de visualisation (à explorer)

**Option 1: Tree View** (Plus simple)
```
📦 Namespaces
├── default
│   ├── 🚀 Deployment: nginx-deployment (3/3)
│   │   ├── ✅ Pod: nginx-abc123 (Running)
│   │   ├── ✅ Pod: nginx-def456 (Running)
│   │   └── ✅ Pod: nginx-ghi789 (Running)
│   └── 🔌 Service: nginx-service (ClusterIP)
└── kube-system
    └── ✅ Pod: coredns-xyz (Running)
```

**Option 2: Graph View** (Plus avancé)
- Nodes visuels pour chaque ressource
- Flèches pour les relations (Service → Pods, Deployment → Pods)
- Couleurs pour les états (vert=healthy, rouge=error, jaune=warning)
- Canvas HTML5 ou SVG

**Option 3: Cards Grid** (Compromis)
- Cards daisyUI pour chaque ressource
- Disposition en grid responsive
- Icônes pour types de ressources
- Badges pour statuts

**Implémentation** : Factory function avec modes (tree/graph/cards) - Sprint 18

### Intégration UI

#### Mode "Learning" Layout
```
┌─────────────────────────────────────────────────────────┐
│ Header: [Mode selector] [Progress] [Help]              │
├──────────────────────────┬──────────────────────────────┤
│                          │  Lesson Panel                │
│  Terminal                │  ┌────────────────────────┐  │
│  (70%)                   │  │ Section 1: Pods        │  │
│                          │  │ Text + images          │  │
│  kubectl>                │  │                        │  │
│                          │  └────────────────────────┘  │
│                          │  [< Previous] [Next >]       │
│                          │                              │
│                          │  Objectives: ✅ ✅ ⬜        │
└──────────────────────────┴──────────────────────────────┘
```

#### Mode "Challenge" Layout
```
┌─────────────────────────────────────────────────────────┐
│ Challenge: Debug Crashing Pod [🔥 Hard]                │
├──────────────────────────┬──────────────────────────────┤
│  Terminal                │  Objectives                  │
│                          │  ⬜ Find crashing pod        │
│  kubectl>                │  ⬜ Identify error           │
│                          │  ⬜ Fix and verify           │
│                          │                              │
│                          │  Hints (2/5 used)            │
│                          │  💡 Try describe command     │
│                          │  [Show next hint]            │
└──────────────────────────┴──────────────────────────────┘
```

#### Mode "Visual" Layout
```
┌─────────────────────────────────────────────────────────┐
│ [Terminal] [Visual] [Both]                              │
├──────────────────────────┬──────────────────────────────┤
│  Terminal (50%)          │  Cluster Visualizer (50%)    │
│                          │                              │
│  kubectl> get pods       │  📦 default                  │
│                          │  ├─ 🚀 nginx-deploy         │
│  NAME      STATUS        │  │  └─ ✅ Pod (Running)     │
│  nginx-1   Running       │  └─ 🔌 Service              │
└──────────────────────────┴──────────────────────────────┘
```

---

## 📝 Notes

- Privilégier les APIs web natives quand possible
- Garder le code simple et lisible
- Chaque module doit être testable indépendamment
- La simulation n'a pas besoin d'être parfaite, juste pédagogiquement utile

