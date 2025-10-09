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
- **Clean Architecture** : Séparation des responsabilités
- **Découplage** : Modules indépendants et testables
- **Indentation max** : 3 niveaux [[memory:7046752]]
- **Pas de switch statements** [[memory:7046752]]

### Structure des modules

```
src/
├── core/
│   ├── cluster/
│   │   ├── ClusterState.ts        # État du cluster
│   │   ├── ResourceManager.ts     # Gestion CRUD des ressources
│   │   └── models/                # Modèles de ressources K8s
│   │       ├── Pod.ts
│   │       ├── Deployment.ts
│   │       ├── Service.ts
│   │       └── Namespace.ts
│   ├── commands/
│   │   ├── CommandParser.ts       # Parse les commandes kubectl
│   │   ├── CommandExecutor.ts     # Exécute les commandes
│   │   └── handlers/              # Handlers par commande
│   │       ├── GetHandler.ts
│   │       ├── DescribeHandler.ts
│   │       ├── DeleteHandler.ts
│   │       ├── CreateHandler.ts
│   │       └── ApplyHandler.ts
│   └── storage/
│       └── StorageAdapter.ts      # Abstraction persistance
├── terminal/
│   ├── TerminalManager.ts         # Gestion xterm.js
│   └── OutputFormatter.ts         # Formatage output kubectl
├── ui/
│   └── styles/                    # CSS BEM
│       ├── terminal.css
│       └── layout.css
└── utils/
    ├── yaml-parser.ts             # Parse YAML pour kubectl apply
    └── table-formatter.ts         # Format output en tables
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

### Données initiales (Seed Cluster)

Cluster pré-peuplé avec :
- Namespaces : `default`, `kube-system`
- Quelques pods exemple (nginx, redis, etc.)
- 1-2 deployments
- 1-2 services

---

## 🎨 Interface utilisateur

### Layout
- Terminal centré horizontalement et verticalement
- Largeur responsive (max-width pour lisibilité)
- Theme daisyUI [[memory:7046767]]
- Possibilité de fullscreen (?)

### CSS BEM
```
.terminal
.terminal__container
.terminal__header
.terminal__output
```

---

## ✅ Tests (TDD)

### Framework de tests
- **Vitest** : Intégration native avec Vite, TypeScript support

### Couverture souhaitée
- **Parseur de commandes** : 100%
- **Gestionnaire de ressources** : 100%
- **Handlers de commandes** : 80%+
- **Formatage output** : 80%+

### Types de tests
- Tests unitaires pour chaque module
- Tests d'intégration pour les flux complets
- Tests de snapshot pour l'output formaté (?)

---

## ✅ Décisions techniques

### Phase 1 (MVP)
- **Framework de tests** : ✅ Vitest
- **Persistance** : ✅ localStorage (IndexedDB en Phase 2 si besoin)
- **Parser YAML/JSON** : ❌ Pas pour l'instant (Phase 2+)
- **TypeScript** : ✅ Strict mode activé
- **Messages d'erreur** : ✅ Simplifiés mais architecture flexible
- **Terminal** : ✅ Saisie basique uniquement
- **Interface** : ✅ Terminal uniquement (pas de sidebar)
- **Thème** : ✅ Dark theme (daisyUI + xterm)
- **Commandes** : ✅ kubectl basiques (get, describe, delete)

### Phase 2+ (Future)
- Historique commandes (↑↓), autocomplétion (Tab)
- Parser YAML pour `kubectl apply -f`
- IndexedDB si localStorage insuffisant
- Interface visuelle du cluster (sidebar)
- Messages d'erreur type kubectl réel
- Modes d'apprentissage guidés

---

## 🎯 Critères de succès MVP

- Terminal fonctionnel et esthétique (centré, thème dark)
- Au moins 8 commandes kubectl supportées (get, describe, delete)
- Cluster stateful qui persiste entre sessions (localStorage)
- Couverture de tests > 80%
- Code TypeScript strict mode
- Architecture modulaire et découplée
- Messages d'erreur clairs et pédagogiques
- Zéro dépendances inutiles [[memory:7046756]]

---

## 📝 Notes

- Privilégier les APIs web natives quand possible [[memory:7046756]]
- Garder le code simple et lisible
- Chaque module doit être testable indépendamment
- La simulation n'a pas besoin d'être parfaite, juste pédagogiquement utile

