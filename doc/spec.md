# Spécification - Simulateur kubectl avec xterm.js

## 🎯 Vue d'ensemble

Application web interactive permettant de s'entraîner aux commandes `kubectl` via un terminal simulé, avec un cluster Kubernetes virtuel stateful.

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
- **Build** : Vite [[memory:7046759]]
- **UI Framework** : daisyUI [[memory:6873963]]
- **Tests** : Vitest
- **Persistance** : localStorage (Phase 1), IndexedDB (Phase 2+)

### Principes architecturaux [[memory:6873972]]
- **KISS** : Keep It Simple, Stupid
- **DRY** : Don't Repeat Yourself
- **Functional Programming** : Éviter les classes, préférer les fonctions pures et les closures
- **Clean Architecture** : Séparation des responsabilités
- **Découplage** : Modules indépendants et testables
- **Indentation max** : 3 niveaux [[memory:7046752]]
- **Pas de switch statements** [[memory:7046752]]

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
│   │       └── apply.ts
│   └── formatters/
│       └── table-formatter.ts     # Format output en tables (fonction pure)
├── cluster/                       # Feature: cluster K8s
│   ├── ClusterState.ts            # État du cluster (factory function)
│   ├── models/                    # Modèles de ressources K8s
│   │   ├── Pod.ts                 # Factory functions
│   │   ├── Deployment.ts
│   │   ├── Service.ts
│   │   └── Namespace.ts
│   ├── seedCluster.ts             # Données initiales (fonction pure)
│   └── storage/
│       └── adapter.ts             # Abstraction persistance (factory function)
├── filesystem/                    # Feature: Virtual file system (Phase 1)
│   ├── FileSystem.ts              # État du filesystem (factory function)
│   ├── models/
│   │   ├── File.ts                # Factory pour fichiers (YAML manifests)
│   │   └── Directory.ts           # Factory pour dossiers
│   └── seedFileSystem.ts          # Filesystem initial (root + exemples)
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
│   │       └── rm.ts
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

// Factory functions (functional programming)
const createDirectory = (name: string, path: string): DirectoryNode => ({
  type: "directory",
  name,
  path,
  children: new Map()
})

const createFile = (name: string, path: string, content = ""): FileNode => ({
  type: "file",
  name,
  path,
  content,
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString()
})
```

### Contraintes du filesystem

- **Profondeur maximale** : 3 niveaux (racine + 3)
  - Exemple valide : `/manifests/dev/pods/nginx.yaml` (profondeur 3)
  - Exemple invalide : `/a/b/c/d/file.yaml` (profondeur 4)
- **Noms de fichiers** : alphanumérique + `-_./`
- **Extensions** : `.yaml`, `.yml` supportées
- **Caractères interdits** : `*`, `?`, `<`, `>`, `|`, espaces
- **Chemins** : Format Unix (`/path/to/file`)
- **Racine** : Toujours `/` (home directory virtuel)

### Exemple de ressource Pod

```typescript
interface Pod {
  apiVersion: "v1"
  kind: "Pod"
  metadata: {
    name: string
    namespace: string
    labels?: Record<string, string>
    creationTimestamp: string
  }
  spec: {
    containers: Container[]
  }
  status: {
    phase: "Pending" | "Running" | "Succeeded" | "Failed" | "Unknown"
    restartCount: number
    containerStatuses?: ContainerStatus[]
  }
}

// Factory function (functional programming)
const createPod = (name: string, namespace: string, containers: Container[]): Pod => ({
  apiVersion: "v1",
  kind: "Pod",
  metadata: {
    name,
    namespace,
    creationTimestamp: new Date().toISOString()
  },
  spec: { containers },
  status: {
    phase: "Pending",
    restartCount: 0
  }
})
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

### Prompt Terminal Dynamique

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

**Format du prompt** :
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

### Exemple d'implémentation fonctionnelle

```typescript
// Terminal: Factory function avec closures
export const createTerminalManager = (container: HTMLElement) => {
  const terminal = new Terminal({ /* config */ })
  let currentLine = ''
  let commandCallback: ((cmd: string) => void) | undefined
  
  const handleInput = (data: string) => {
    // Logic...
  }
  
  terminal.open(container)
  terminal.onData(handleInput)
  
  return {
    write: (text: string) => terminal.write(text),
    onCommand: (cb) => { commandCallback = cb },
    showPrompt: () => terminal.write('kubectl> '),
    focus: () => terminal.focus()
  }
}
```

```typescript
// Command Dispatcher: Route vers kubectl ou shell commands
export const createCommandDispatcher = (
  clusterState: ClusterState,
  fileSystem: FileSystem,
  terminal: TerminalManager
) => {
  const kubectlExecutor = createKubectlExecutor(clusterState, fileSystem)
  const shellExecutor = createShellExecutor(fileSystem)
  
  const dispatch = (input: string): string => {
    const trimmed = input.trim()
    
    if (trimmed.startsWith('kubectl ')) {
      return kubectlExecutor.execute(trimmed)
    }
    
    // Shell commands (cd, ls, pwd, mkdir, touch, cat, rm, clear, help)
    return shellExecutor.execute(trimmed)
  }
  
  return { dispatch }
}
```

```typescript
// FileSystem: Factory function avec closures + pure functions
// Pure functions pour les opérations
const resolvePath = (currentPath: string, targetPath: string): string => {
  // Résout chemin relatif/absolu
  if (targetPath.startsWith('/')) return targetPath
  // ... logic
}

const getDepth = (path: string): number => {
  return path.split('/').filter(p => p.length > 0).length
}

const findNode = (tree: DirectoryNode, path: string): FileSystemNode | undefined => {
  // Traverse l'arbre pour trouver le nœud (fonction pure)
}

// Facade avec closures
export const createFileSystem = (initialState?: FileSystemState) => {
  let state: FileSystemState = initialState || {
    currentPath: '/',
    tree: createDirectory('root', '/')
  }

  return {
    getCurrentPath: () => state.currentPath,
    
    changeDirectory: (path: string) => {
      const absolutePath = resolvePath(state.currentPath, path)
      const node = findNode(state.tree, absolutePath)
      
      if (!node || node.type !== 'directory') {
        return { type: 'error', message: 'Directory not found' }
      }
      
      state = { ...state, currentPath: absolutePath }
      return { type: 'success', data: absolutePath }
    },
    
    listDirectory: (path?: string) => {
      const targetPath = path ? resolvePath(state.currentPath, path) : state.currentPath
      const node = findNode(state.tree, targetPath)
      
      if (!node || node.type !== 'directory') {
        return { type: 'error', message: 'Not a directory' }
      }
      
      return { type: 'success', data: Array.from(node.children.values()) }
    },
    
    createDirectory: (name: string) => {
      const newPath = `${state.currentPath}/${name}`.replace('//', '/')
      
      if (getDepth(newPath) > 3) {
        return { type: 'error', message: 'Max depth of 3 exceeded' }
      }
      
      // ... mutation de state.tree (immutable update)
      return { type: 'success', data: newPath }
    },
    
    createFile: (name: string, content = '') => {
      const newPath = `${state.currentPath}/${name}`.replace('//', '/')
      // ... créer fichier
    },
    
    readFile: (path: string) => {
      const absolutePath = resolvePath(state.currentPath, path)
      const node = findNode(state.tree, absolutePath)
      
      if (!node || node.type !== 'file') {
        return { type: 'error', message: 'File not found' }
      }
      
      return { type: 'success', data: node.content }
    },
    
    writeFile: (path: string, content: string) => {
      // Update file content (immutable)
    },
    
    toJSON: () => state,
    loadState: (newState: FileSystemState) => { state = newState }
  }
}
```

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

### Exemple de test fonctionnel

```typescript
// Fonction pure = test simple
describe('parseCommand', () => {
  it('should parse get pods command', () => {
    const result = parseCommand('kubectl get pods')
    expect(result).toEqual({
      action: 'get',
      resource: 'pods',
      name: undefined,
      flags: {}
    })
  })
})

// Factory function = test avec setup
describe('createTerminalManager', () => {
  it('should handle commands', () => {
    const container = document.createElement('div')
    const terminal = createTerminalManager(container)
    const callback = vi.fn()
    
    terminal.onCommand(callback)
    terminal.simulateInput('test\r')
    
    expect(callback).toHaveBeenCalledWith('test')
  })
})
```

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
- **Commandes kubectl** : ✅ get, describe, delete, apply, create
- **Commandes shell** : ✅ cd, ls, pwd, mkdir, touch, cat, rm, clear, help
- **Virtual FileSystem** : ✅ Max 3 niveaux de profondeur
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
- Au moins 8 commandes kubectl supportées (get, describe, delete, apply, create)
- Commandes shell basiques (cd, ls, pwd, mkdir, touch, cat, rm)
- Virtual filesystem fonctionnel (max 3 niveaux, persistance)
- Cluster stateful qui persiste entre sessions (localStorage)
- Filesystem persiste entre sessions (localStorage)
- Intégration kubectl + filesystem (`kubectl apply -f path/to/file.yaml`)
- Couverture de tests > 80%
- Code TypeScript strict mode
- Architecture modulaire et découplée (ClusterState + FileSystem)
- Messages d'erreur clairs et pédagogiques
- Dépendances minimales (uniquement js-yaml en plus de xterm) [[memory:7046756]]

---

## 🎓 Learning Platform (Phase 3)

### Challenges System

**Objectif** : Scénarios pratiques où l'utilisateur doit résoudre un problème réel

#### Modèle de données Challenge

```typescript
interface Challenge {
  id: string
  title: string
  description: string
  difficulty: "beginner" | "intermediate" | "advanced"
  category: "debugging" | "scaling" | "networking" | "security"
  
  // Seed cluster pré-configuré pour ce challenge
  initialClusterState: ClusterState
  
  // Objectifs à atteindre
  objectives: Objective[]
  
  // Hints progressifs
  hints: string[]
  
  // Validation
  validator: (state: ClusterState, history: string[]) => ValidationResult
}

interface Objective {
  id: string
  description: string
  isCompleted: (state: ClusterState) => boolean
}

type ValidationResult = 
  | { type: 'incomplete', nextHint?: string }
  | { type: 'success', message: string, score: number }
  | { type: 'failed', reason: string }
```

#### Exemples de Challenges

1. **"Debug a Crashing Pod"**
   - État initial : Pod en CrashLoopBackOff
   - Objectif : Identifier le problème et le corriger
   - Validation : Pod passe en Running

2. **"Scale a Deployment"**
   - État initial : Deployment avec 1 replica sous charge
   - Objectif : Scaler à 3 replicas
   - Validation : 3 pods Running avec bon label

3. **"Fix Networking Issue"**
   - État initial : Service pointe vers mauvais pods
   - Objectif : Corriger les labels/selectors
   - Validation : Service expose les bons pods

4. **"Resource Cleanup"**
   - État initial : Cluster avec ressources orphelines
   - Objectif : Supprimer pods non utilisés
   - Validation : Seulement pods essentiels restent

### Lessons System

**Objectif** : Tutoriels interactifs guidés avec théorie + pratique

#### Modèle de données Lesson

```typescript
interface Lesson {
  id: string
  title: string
  category: "basics" | "intermediate" | "advanced"
  duration: number  // minutes estimées
  
  // Contenu pédagogique
  sections: LessonSection[]
  
  // Cluster pour expérimentation
  playgroundState?: ClusterState
  
  // Progression
  progress: number  // 0-100%
}

interface LessonSection {
  type: "text" | "example" | "exercise" | "quiz"
  title: string
  content: string | ExerciseContent | QuizContent
}

interface ExerciseContent {
  instruction: string
  expectedCommands?: string[]
  validator: (state: ClusterState, commands: string[]) => boolean
  solution: string
}
```

#### Exemples de Lessons

1. **"Introduction to Pods"**
   - Qu'est-ce qu'un Pod ?
   - Anatomy d'un Pod (containers, labels, status)
   - Exercice : Lister et inspecter des pods
   - Quiz : Identifier l'état d'un Pod

2. **"Working with Deployments"**
   - Pourquoi les Deployments ?
   - Relation Deployment → ReplicaSet → Pods
   - Exercice : Créer et scaler un deployment
   - Challenge : Rolling update

3. **"Kubernetes Networking Basics"**
   - Services et leurs types
   - Labels et selectors
   - Exercice : Exposer une app avec un Service

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

#### Implémentation recommandée (Phase 3)

```typescript
// Factory function pour le visualizer
const createClusterVisualizer = (container: HTMLElement, mode: 'tree' | 'graph' | 'cards') => {
  let currentState: ClusterState
  
  const render = (state: ClusterState) => {
    currentState = state
    if (mode === 'tree') renderTree(container, state)
    if (mode === 'graph') renderGraph(container, state)
    if (mode === 'cards') renderCards(container, state)
  }
  
  const renderTree = (container: HTMLElement, state: ClusterState) => {
    // Pure HTML/CSS tree avec accordéons daisyUI
  }
  
  return {
    render,
    setMode: (newMode) => { mode = newMode; render(currentState) },
    destroy: () => { container.innerHTML = '' }
  }
}
```

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

- Privilégier les APIs web natives quand possible [[memory:7046756]]
- Garder le code simple et lisible
- Chaque module doit être testable indépendamment
- La simulation n'a pas besoin d'être parfaite, juste pédagogiquement utile
- Phase 3 (Learning Platform) : à concevoir après validation du MVP

