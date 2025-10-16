# 🗺️ Roadmap - Kube Simulator

## 📊 État actuel du projet

**~439 tests passent** | **Coverage: 91.65%** | **Architecture: Functional (Factory + Pure functions + Event Sourcing + Observer Pattern)**

### ✅ Completé
- **Sprint 1**: Terminal xterm.js fonctionnel (9 tests)
- **Sprint 2**: Pod model + ClusterState (43 tests)
- **Sprint 3.1**: Parser kubectl avec aliases (33 tests)
- **Sprint 3.2**: Executor avec routing (24 tests)
- **Sprint 3.3**: Terminal Integration (8 tests)
- **Sprint 4.1-4.3**: FileSystem Foundation (103 tests) - Library-ready design
- **Sprint 4.4**: Shell Parser + Executor (47 tests) - Pure functions + Factory pattern + Result centralization
- **Sprint 4.5**: Image Registry + Pull Simulation (25 tests) - Validation stricte + Pull events
- **Sprint 4.6**: Shell Handlers (47 tests) - cd, ls, pwd, mkdir, touch, cat, rm
- **Sprint 4.7**: Application Logger (21 tests) - Event Sourcing + Observer Pattern + Console mirroring
- **Sprint 4.8**: Command Dispatcher (8 tests) - Routing kubectl vs shell + Dynamic prompt
- **Sprint 4.9**: Terminal UX Enhancements (12 tests) - Command history + Enhanced prompt
- **Sprint 4.10**: Tab Autocompletion (61 tests) - Bash-like autocomplete for commands, resources, files, and flags
- **UI Enhancement**: Titre ASCII "KubeSimulator" + description - Landing page améliorée avec theming daisyUI
- **UX Enhancement**: Welcome message enrichi avec commandes clés (help, kubectl get pods, debug images)

### 🎯 Prochaine étape
**Sprint 5.1** - Table Formatter (formatage ASCII pour kubectl get)

### 📋 À venir (Roadmap complète enrichie - 26 sprints)
- **Sprint 4-6**: MVP (FileSystem, Shell, kubectl + Core K8s Resources, Storage)
- **Phase 2 (Sprint 7-14)**: Advanced K8s Resources (Multi-container, PV/PVC, Jobs, RBAC, HPA, Terminal UX)
- **Phase 3 (Sprint 15-20)**: Learning Platform (Chaos, Challenges, Lessons, Visualizer)
- **Phase 4 (Sprint 21-26)**: Advanced Infrastructure (Nodes, CoreDNS, Control Plane, Differentiators)

### 🎯 Must-Have pour rivaliser avec KodeKloud/Killer.sh
**Sprint 5** intègre maintenant les éléments critiques:
- ConfigMaps & Secrets (stockage configuration)
- kubectl exec (debugging #1)
- Resource requests/limits (QoS)
- Liveness/Readiness probes (health checks)
- Labels & Selectors avancés (filtrage `-l`)
- kubectl label/annotate (manipulation metadata)


---

## 🎯 Sprint 4 : FileSystem + Shell Commands

**Objectif**: Système de fichiers virtuel et commandes shell de base

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

## 🎯 Sprint 4.9 : Terminal UX Enhancements ✅

**Objectif**: Améliorer l'expérience utilisateur du terminal avec historique et prompt

### 4.9.1 - Command History (TDD) ✅
- ✅ Enrichir `src/terminal/TerminalManager.ts`
  - Array pour stocker historique (max 100 commandes)
  - Index de navigation dans l'historique
  - Handler pour arrow keys (↑ = previous, ↓ = next)
  - Restore currentLine quand on quitte l'historique
- ✅ ~8-10 tests

### 4.9.2 - Enhanced Prompt (TDD) ✅
- ✅ Modifier `src/main.ts` - fonction `getPrompt()`
  - Format: `☸ />` à la racine
  - Format: `☸ ~/manifests/dev>` ailleurs
  - Conserver logique actuelle (~ pour chemins non-root)
- ✅ ~2-4 tests

### Définition de Done
- ✅ ↑↓ navigue dans l'historique (max 100 commandes)
- ✅ Prompt affiche ☸ + chemin simple
- ✅ Tests > 80% coverage
- ✅ ~10-12 tests total pour Sprint 4.9

---

## 🎯 Sprint 4.10 : Tab Autocompletion ✅

**Objectif**: Autocomplétion bash-like pour commandes, ressources, fichiers et flags

### 4.10.1 - Autocomplete Module (TDD) ✅
- ✅ `src/terminal/autocomplete.ts`
  - Pure functions pour logique d'autocomplétion
  - `getCompletions()` - Suggestions contextuelles
  - `getCommonPrefix()` - Calcul préfixe commun
  - `formatSuggestions()` - Format colonnes (bash-like)
- ✅ ~47 tests

### 4.10.2 - Terminal Integration (TDD) ✅
- ✅ Update `src/terminal/TerminalManager.ts`
  - Détection Tab key (charCode 9)
  - Double-tab detection (< 500ms)
  - Single Tab = complete common prefix
  - Double Tab = show all options
- ✅ Update `src/main.ts`
  - Pass autocomplete context (clusterState + fileSystem)
- ✅ ~14 tests

### Fonctionnalités ✅
- ✅ Autocomplétion commandes (kubectl, cd, ls, pwd, etc.)
- ✅ Autocomplétion kubectl actions (get, describe, delete, etc.)
- ✅ Autocomplétion resource types (pods, deployments, services, etc.)
- ✅ Autocomplétion resource names depuis cluster
- ✅ Autocomplétion chemins fichiers/dossiers
- ✅ Autocomplétion flags (-n, --namespace, -f, etc.)
- ✅ Comportement bash: Tab = prefix, Tab Tab = show all

### Définition de Done
- ✅ Tab complète common prefix ou full word si unique
- ✅ Double Tab affiche toutes les options (< 500ms)
- ✅ Autocomplétion contextuelle (commands → actions → resources → names)
- ✅ Autocomplétion chemins (absolute et relative)
- ✅ Tests > 80% coverage
- ✅ ~61 tests total pour Sprint 4.10

---

## 🎯 Sprint 5 : kubectl Handlers + Core Resources (MVP)

**Objectif**: Implémenter les commandes kubectl essentielles + ressources K8s critiques

### 5.1 - Table Formatter (TDD)
- [ ] `src/kubectl/formatters/table-formatter.ts`
  - Fonction pure `formatTable(headers, rows): string`
  - Calcul largeur colonnes, alignement, padding
  - Format ASCII (comme kubectl)
- [ ] ~10-12 tests

### 5.2 - Core Resource Models (TDD) 🔥 CRITIQUE
- [ ] `src/cluster/models/ConfigMap.ts` - Factory pour ConfigMaps
  - Store configuration data (key-value pairs)
  - Support `data` et `binaryData` fields
- [ ] `src/cluster/models/Secret.ts` - Factory pour Secrets
  - Store sensitive data (base64 encoded)
  - Types: Opaque, kubernetes.io/service-account-token, etc.
- [ ] Enrichir Pod model avec:
  - Resource requests/limits (CPU, memory) dans container spec
  - Liveness/Readiness/Startup probes (httpGet, exec, tcpSocket)
  - Environment variables (valueFrom: configMapKeyRef, secretKeyRef)
  - Volume mounts (configMap, secret, emptyDir)
- [ ] `src/cluster/models/probeSimulator.ts` - Pure functions
  - `evaluateLivenessProbe()`, `evaluateReadinessProbe()`
  - Simulation health checks → restart pod si liveness fail
- [ ] ~25-30 tests

### 5.3 - Get Handlers (TDD)
- [ ] Améliorer `src/kubectl/commands/handlers/get.ts`
  - Utiliser table formatter
  - Support: pods, deployments, services, configmaps, secrets, namespaces
  - Filtre par namespace (`-n` flag)
  - Filtre par labels (`-l` flag) 🔥 CRITIQUE
  - Calcul AGE (fonction utilitaire)
  - Logger les requêtes (application logger)
- [ ] ~20-25 tests

### 5.4 - Describe Handler (TDD)
- [ ] Améliorer `src/kubectl/commands/handlers/describe.ts`
  - Format multi-lignes détaillé
  - Affichage complet des métadonnées, labels, annotations
  - Environment variables (avec masquage secrets)
  - Volume mounts
  - Probes configuration
- [ ] ~12-15 tests

### 5.5 - Apply/Create Handlers (TDD)
- [ ] Install `js-yaml` dependency
- [ ] Améliorer `src/kubectl/commands/handlers/apply.ts`
  - Read file from FileSystem
  - Parse YAML (`js-yaml`)
  - Create/update: Pod, ConfigMap, Secret, Deployment, Service
  - Validation schema basique
- [ ] ~20-25 tests

### 5.6 - kubectl logs + exec (TDD) 🔥 CRITIQUE
- [ ] Améliorer Pod model: `status.logs: LogEntry[]`
- [ ] **Préparer Chaos Hooks** : Ajouter `chaosConfig?: ChaosConfig` dans Pod/Deployment models
- [ ] `src/kubectl/commands/handlers/logs.ts`
  - Support `kubectl logs <pod-name>`
  - Support `-n <namespace>`, `--tail=N`, `-f` (simulation follow)
- [ ] `src/kubectl/commands/handlers/exec.ts` 🔥 MUST-HAVE
  - `kubectl exec -it <pod> -- <command>`
  - Simulation interactive shell (commandes: ls, pwd, env, cat, echo, exit)
  - Message pédagogique si commande non supportée
- [ ] `src/cluster/models/logGenerator.ts` - Pure functions
  - Logs dynamiques par container type + phase
  - Rotation automatique (max 200 lignes/pod)
- [ ] ~25-30 tests

### 5.7 - kubectl label & annotate (TDD) 🔥 CRITIQUE
- [ ] `src/kubectl/commands/handlers/label.ts`
  - `kubectl label pods <name> <key>=<value>`
  - `kubectl label pods <name> <key>-` (remove label)
  - Support `--overwrite` flag
- [ ] `src/kubectl/commands/handlers/annotate.ts`
  - Même logique que label mais pour annotations
- [ ] ~15-20 tests

### Définition de Done
- ✅ ConfigMaps & Secrets créables et injectables dans pods
- ✅ Resource requests/limits supportés dans Pod spec
- ✅ Probes (liveness/readiness) fonctionnels avec simulation restart
- ✅ `kubectl get pods -l app=nginx` filtre par labels
- ✅ `kubectl exec -it pod -- /bin/sh` fonctionne (shell simulé)
- ✅ `kubectl label/annotate` pour manipuler metadata
- ✅ `kubectl describe` affiche toutes les infos (env, volumes, probes)
- ✅ `kubectl apply -f` crée ConfigMaps/Secrets depuis YAML
- ✅ Tests > 85% coverage
- ✅ **~130-160 tests total pour Sprint 5**

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
- [ ] UI: Registry panel (liste images + tags disponibles)
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

## 🚀 Phase 2 : Advanced Kubernetes Features

**Objectif**: Ressources K8s avancées pour reproduction complète de l'expérience CKA/CKAD

### Sprint 7 : Multi-Container Pods & Init Containers ⭐ HAUTE

**Objectif**: Patterns architecturaux courants (sidecar, adapter, ambassador)

- [ ] Enrichir Pod model pour multi-containers
  - Support multiple containers dans `spec.containers[]`
  - Shared volumes entre containers (emptyDir)
  - Network namespace partagé (localhost communication)
- [ ] Init Containers
  - `spec.initContainers[]` - s'exécutent avant main containers
  - Séquence d'exécution (ordre dans le array)
  - Simulation setup tasks (migration DB, wait-for dependencies)
- [ ] Exemples seed:
  - Sidecar pattern: app + logging agent
  - Init pattern: DB migration before app start
- [ ] ~20-25 tests

**Définition de Done**:
- ✅ Pod avec 2+ containers fonctionnel
- ✅ Init containers s'exécutent avant main containers
- ✅ Shared volumes fonctionnent (emptyDir)
- ✅ `kubectl logs <pod> -c <container>` spécifie container

---

### Sprint 8 : Storage (PV/PVC) & StatefulSets ⭐ HAUTE

**Objectif**: Storage persistent et workloads stateful

#### 8.1 - PersistentVolumes & Claims (TDD)
- [ ] `src/cluster/models/PersistentVolume.ts` - Factory pour PV
  - Capacity, accessModes (ReadWriteOnce, ReadWriteMany, ReadOnlyMany)
  - StorageClass, reclaimPolicy (Retain, Delete, Recycle)
  - Status: Available, Bound, Released, Failed
- [ ] `src/cluster/models/PersistentVolumeClaim.ts` - Factory pour PVC
  - Requested capacity, accessModes, storageClassName
  - Binding logic (match PV to PVC)
- [ ] Binding simulation (pure function)
  - Automatic binding: find matching PV for PVC
  - Status transitions: Pending → Bound
- [ ] ~20-25 tests

#### 8.2 - StatefulSets (TDD)
- [ ] `src/cluster/models/StatefulSet.ts` - Factory pour StatefulSets
  - Ordered pod creation/deletion (pod-0, pod-1, pod-2...)
  - Stable network identities: `<statefulset>-<ordinal>.<service>`
  - Persistent storage per replica (volumeClaimTemplates)
  - Update strategies: RollingUpdate, OnDelete
- [ ] Controllers simulation
  - Create pods in order
  - Maintain stable naming
  - Auto-create PVCs from templates
- [ ] `kubectl scale statefulset` handler
- [ ] ~25-30 tests

**Définition de Done**:
- ✅ PV/PVC lifecycle complet (Available → Bound)
- ✅ StatefulSet crée pods ordonnés avec storage persistent
- ✅ `kubectl get pv/pvc` fonctionne
- ✅ Scaling StatefulSet respecte l'ordre

---

### Sprint 9 : Workloads - Jobs, CronJobs, DaemonSets ⭐ HAUTE

**Objectif**: Workloads spécialisés pour batch et infrastructure

#### 9.1 - Jobs (TDD)
- [ ] `src/cluster/models/Job.ts` - Factory pour Jobs
  - Completions, parallelism, backoffLimit
  - Status: Active, Succeeded, Failed
  - Pod template spec
- [ ] Job controller simulation
  - Create pods until completion
  - Track completions
  - Cleanup policy (TTL after finished)
- [ ] `kubectl create job`, `kubectl delete job`
- [ ] ~15-20 tests

#### 9.2 - CronJobs (TDD)
- [ ] `src/cluster/models/CronJob.ts` - Factory pour CronJobs
  - Schedule (cron syntax)
  - Job template
  - concurrencyPolicy: Allow, Forbid, Replace
  - successfulJobsHistoryLimit, failedJobsHistoryLimit
- [ ] CronJob controller (simulation timestamp-based)
  - Parse cron schedule
  - Create Jobs selon schedule
  - History cleanup
- [ ] ~15-20 tests

#### 9.3 - DaemonSets (TDD)
- [ ] `src/cluster/models/DaemonSet.ts` - Factory pour DaemonSets
  - Un pod par node (simulation multi-node)
  - updateStrategy: RollingUpdate, OnDelete
- [ ] DaemonSet controller
  - Ensure 1 pod per node
  - Node selector support
- [ ] ~15-20 tests

**Définition de Done**:
- ✅ Job exécute task et track completions
- ✅ CronJob crée Jobs selon schedule
- ✅ DaemonSet maintient 1 pod/node
- ✅ `kubectl get jobs/cronjobs/daemonsets` fonctionne

---

### Sprint 10 : kubectl Advanced Commands ⭐ HAUTE

**Objectif**: Commandes kubectl critiques pour debugging et ops

#### 10.1 - kubectl rollout (TDD) 🔥 MUST-HAVE
- [ ] `src/kubectl/commands/handlers/rollout.ts`
  - `kubectl rollout status deployment/<name>`
  - `kubectl rollout history deployment/<name>`
  - `kubectl rollout undo deployment/<name>` (rollback)
  - `kubectl rollout pause/resume deployment/<name>`
- [ ] Revision tracking dans Deployment
- [ ] ~20-25 tests

#### 10.2 - kubectl port-forward (TDD) 🔥 MUST-HAVE
- [ ] `src/kubectl/commands/handlers/port-forward.ts`
  - `kubectl port-forward pod/<name> 8080:80`
  - Simulation message (pas de vrai tunnel, juste pédagogique)
  - Afficher accès URL (http://localhost:8080)
- [ ] ~10-12 tests

#### 10.3 - kubectl top (TDD)
- [ ] `src/kubectl/commands/handlers/top.ts`
  - `kubectl top pods` - afficher CPU/memory usage
  - `kubectl top nodes` - stats par node
  - Fake metrics basées sur resource requests
- [ ] ~12-15 tests

#### 10.4 - kubectl config (contexts/kubeconfig) (TDD)
- [ ] `src/cluster/models/KubeConfig.ts` - Contexts, clusters, users
  - Multiple contexts (dev, staging, prod)
  - Current context tracking
- [ ] `src/kubectl/commands/handlers/config.ts`
  - `kubectl config get-contexts`
  - `kubectl config use-context <name>`
  - `kubectl config set-context --current --namespace=<ns>`
- [ ] Prompt update selon context/namespace
- [ ] ~15-20 tests

**Définition de Done**:
- ✅ `kubectl rollout undo` fait rollback
- ✅ `kubectl port-forward` simule tunneling
- ✅ `kubectl top` affiche métriques
- ✅ Switch contexts fonctionne, prompt s'adapte

---

### Sprint 11 : Security & Networking (RBAC, Ingress) 🎯 MOYENNE

**Objectif**: Sécurité et exposition avancée

#### 11.1 - RBAC (Role-Based Access Control) (TDD)
- [ ] `src/cluster/models/ServiceAccount.ts` - Factory pour ServiceAccounts
- [ ] `src/cluster/models/Role.ts` - Factory pour Roles (namespace-scoped)
- [ ] `src/cluster/models/ClusterRole.ts` - Factory pour ClusterRoles (cluster-wide)
- [ ] `src/cluster/models/RoleBinding.ts` / `ClusterRoleBinding.ts`
- [ ] Permission checking logic (pure function)
  - `canPerformAction(subject, verb, resource, namespace): boolean`
- [ ] `kubectl auth can-i` handler
  - `kubectl auth can-i create pods`
  - `kubectl auth can-i delete deployments --as=user`
- [ ] ~30-35 tests

#### 11.2 - Ingress (TDD)
- [ ] `src/cluster/models/Ingress.ts` - Factory pour Ingress
  - Rules: host + path → backend service
  - TLS configuration
  - Annotations (nginx.ingress.kubernetes.io/*)
- [ ] Ingress routing simulation (pure function)
  - Match request (host/path) → service
- [ ] `kubectl get/describe/apply ingress`
- [ ] ~20-25 tests

#### 11.3 - NetworkPolicies (TDD)
- [ ] `src/cluster/models/NetworkPolicy.ts` - Factory pour NetworkPolicies
  - podSelector (apply policy to pods matching labels)
  - Ingress/Egress rules
  - Allow from specific namespaces/pods
- [ ] Policy evaluation simulation (pédagogique)
  - Check if traffic allowed: pod-A → pod-B
- [ ] `kubectl get/describe networkpolicies`
- [ ] ~20-25 tests

**Définition de Done**:
- ✅ RBAC complet (ServiceAccount, Roles, Bindings)
- ✅ `kubectl auth can-i` valide permissions
- ✅ Ingress route traffic vers services
- ✅ NetworkPolicies appliquent isolation

---

### Sprint 12 : Autoscaling & Resource Quotas 🎯 MOYENNE

**Objectif**: Scaling automatique et governance

#### 12.1 - HorizontalPodAutoscaler (TDD)
- [ ] `src/cluster/models/HorizontalPodAutoscaler.ts` - Factory pour HPA
  - Target: Deployment/ReplicaSet/StatefulSet
  - Metrics: CPU, memory utilization
  - minReplicas, maxReplicas
- [ ] HPA controller simulation
  - Calculate desired replicas basé sur metrics
  - Scale target workload
- [ ] `kubectl autoscale deployment` handler
- [ ] ~20-25 tests

#### 12.2 - ResourceQuotas & LimitRanges (TDD)
- [ ] `src/cluster/models/ResourceQuota.ts` - Factory pour ResourceQuotas
  - Limits per namespace (pods count, CPU, memory)
  - Validation on resource creation
- [ ] `src/cluster/models/LimitRange.ts` - Factory pour LimitRanges
  - Default requests/limits for containers
  - Min/max constraints
- [ ] Quota enforcement (pure function)
  - Block creation if quota exceeded
- [ ] ~20-25 tests

**Définition de Done**:
- ✅ HPA scale automatiquement selon CPU/memory
- ✅ ResourceQuota bloque création si dépassement
- ✅ LimitRange applique defaults automatiquement
- ✅ `kubectl get hpa/quota/limitrange` fonctionne

---

### Sprint 13 : Terminal Enhancements & UX 🎨

**Objectif**: Améliorer expérience utilisateur du terminal

- [ ] **Syntax Highlighting** - Coloration en temps réel pendant frappe
  - Commandes valides (vert), invalides (rouge)
  - Arguments/flags colorés
- [ ] **Enhanced Prompt** - Prompt contextuel avancé
  - Username@hostname, chemin, context/namespace
  - Couleurs adaptatives
- [ ] **Terminal YAML Editor** - Éditeur nano-like intégré
  - `kubectl edit pod <name>` ouvre éditeur
  - Navigation flèches, Ctrl+S save, Ctrl+Q quit
- [ ] ~20-25 tests

**Définition de Done**:
- ✅ Coloration syntaxique temps réel
- ✅ Éditeur YAML intégré utilisable

**Note**: Command history et Tab autocompletion déjà complétés en Sprint 4.9 et 4.10

---

### Sprint 14 : Real Registry Integration & Chaos Hooks 🔧

**Objectif**: Réalisme et préparation Phase 3

- [ ] **Real Registry Integration**
  - Toggle "Use real registry data"
  - Fetch depuis Docker Hub API (dry-run)
  - Fallback hardcodé si offline
  - Cache intelligent + rate limiting
- [ ] **Chaos Hooks Infrastructure**
  - Enrichir models avec `chaosConfig` optionnel
  - Events system étendu
  - Base pour Phase 3 GUI
- [ ] ~15-20 tests

**Estimé Phase 2**: **8 sprints** (Sprint 7-14) après MVP

---

## 🎓 Phase 3 : Learning Platform

**Objectif**: Transformer le simulateur en plateforme d'apprentissage interactive comme KodeKloud/Killer.sh

### Sprint 15 : Chaos Engineering System

**Objectif**: GUI pour disaster recovery training (différenciateur vs autres plateformes)

- [ ] **Chaos Hooks dans models** (si pas fait en Sprint 5)
  - `chaosConfig?: ChaosConfig` dans Pod/Deployment/StatefulSet
  - Flags: crashOnStart, failHealthcheck, imagePullError, networkFailure
- [ ] **GUI Chaos Panel** (hors terminal)
  - Toggle enable/disable chaos mode
  - Sélection targets (pods, images, services)
  - Scenarios prédéfinis: ImagePullBackOff, CrashLoopBackOff, NetworkFailure, OOMKilled
  - Custom scenarios builder
  - Scheduler: trigger immédiat ou après délai
  - Visualisation état actif du chaos
- [ ] **Chaos Controllers**
  - Apply chaos config → update pod status
  - Events tracking
  - Rollback/reset functionality
- [ ] ~25-30 tests

**Définition de Done**:
- ✅ GUI chaos panel fonctionnel
- ✅ 4+ scenarios prédéfinis exécutables
- ✅ Custom scenarios créables
- ✅ Chaos scheduler fonctionne
- ✅ Reset restaure état normal

---

### Sprint 16 : Challenges System

**Objectif**: Exercices pratiques avec validation automatique

- [ ] **Challenge Models**
  - `src/learning/challenges/Challenge.ts` - Types et factory
  - Difficulty: beginner, intermediate, advanced
  - Category: debugging, scaling, networking, security, storage
- [ ] **Challenge Scenarios** (seed clusters pré-configurés)
  - Scenario 1: "Debug Crashing Pod" - Pod en CrashLoopBackOff à diagnostiquer
  - Scenario 2: "Scale Deployment" - Scale de 1 à 3 replicas
  - Scenario 3: "Fix Service" - Service pointe vers mauvais pods (labels)
  - Scenario 4: "Resource Cleanup" - Supprimer ressources orphelines
  - Scenario 5: "ConfigMap Injection" - Créer ConfigMap et l'injecter dans pod
- [ ] **Validator System**
  - `src/learning/challenges/validator.ts` - Pure functions
  - Validation automatique des objectifs
  - Partial completion tracking
- [ ] **Hints System**
  - Hints progressifs (3-5 par challenge)
  - Unlock hint après X tentatives
- [ ] **Challenge UI**
  - Split-view: terminal + objectifs panel
  - Progress indicators
  - Hint button avec compteur
  - Reset button
- [ ] ~30-35 tests

**Définition de Done**:
- ✅ 5+ challenges fonctionnels
- ✅ Validation automatique fonctionne
- ✅ Hints progressifs débloquables
- ✅ UI challenge claire et responsive

---

### Sprint 17 : Lessons System

**Objectif**: Tutoriels interactifs guidés (théorie + pratique)

- [ ] **Lesson Models**
  - `src/learning/lessons/Lesson.ts` - Types et factory
  - Sections: text, example, exercise, quiz
  - Progress tracking (0-100%)
  - Duration estimée
- [ ] **Lesson Content**
  - Lesson 1: "Introduction to Pods" (basics)
  - Lesson 2: "Deployments & ReplicaSets" (basics)
  - Lesson 3: "Services & Networking" (basics)
  - Lesson 4: "ConfigMaps & Secrets" (intermediate)
  - Lesson 5: "Storage with PV/PVC" (intermediate)
  - Lesson 6: "Troubleshooting Pods" (intermediate)
- [ ] **Exercise Validator**
  - Validation des commandes exécutées
  - Vérification état cluster après exercice
  - Solution reveal si bloqué
- [ ] **Lesson UI**
  - Split-view: terminal + lesson panel
  - Navigation: Previous/Next
  - Code snippets copiables
  - Progress bar
- [ ] ~25-30 tests

**Définition de Done**:
- ✅ 6+ lessons disponibles
- ✅ Exercises validés automatiquement
- ✅ UI lesson intuitive
- ✅ Progress saved (localStorage)

---

### Sprint 18 : Cluster Visualizer

**Objectif**: Visualisation graphique de l'état du cluster

- [ ] **Visualizer Core**
  - `src/learning/visualizer/ClusterVisualizer.ts` - Factory
  - 3 modes: Tree view, Cards grid, Graph view
- [ ] **Tree View** (priorité 1)
  - Hiérarchie: Namespace → Workload → Pods
  - Accordéons daisyUI
  - Icônes par resource type
  - Badges pour status (Running, Pending, Failed)
- [ ] **Cards Grid** (priorité 2)
  - Cards daisyUI par ressource
  - Grid responsive
  - Click pour voir détails
- [ ] **Graph View** (optionnel)
  - Nodes visuels avec relations
  - Service → Pods, Deployment → Pods
  - Canvas HTML5 ou SVG
- [ ] **Real-time Sync**
  - Update visualizer quand cluster change
  - Highlight changements récents
- [ ] ~20-25 tests

**Définition de Done**:
- ✅ Tree view fonctionnel et responsive
- ✅ Cards grid alternatif disponible
- ✅ Sync temps réel avec terminal
- ✅ Switch mode view fonctionne

---

### Sprint 19 : Layout Manager & Integration

**Objectif**: Modes d'affichage et intégration finale Phase 3

- [ ] **Layout Manager**
  - Mode "Terminal Only" (plein écran)
  - Mode "Learning" (terminal + lesson panel)
  - Mode "Challenge" (terminal + objectifs panel)
  - Mode "Visual" (terminal + cluster visualizer)
  - Mode switcher dans header
- [ ] **Responsive Layouts**
  - Adaptation mobile/tablet
  - Collapse panels sur petits écrans
  - Touch-friendly
- [ ] **Gamification** (optionnel)
  - Achievements system
  - Points/XP par challenge complété
  - Leaderboard (local)
  - Badges collection
- [ ] **Accessibility**
  - Keyboard navigation
  - ARIA labels
  - Screen reader support
- [ ] ~15-20 tests

**Définition de Done**:
- ✅ 4 modes layout fonctionnels
- ✅ Responsive mobile/tablet
- ✅ Switcher mode intuitif
- ✅ Accessibility basique OK

---

### Sprint 20 : Polish & Documentation Phase 3

**Objectif**: Finalisation et documentation complète

- [ ] **UI Polish**
  - Animations smooth (transitions)
  - Loading states partout
  - Error boundaries
  - Empty states avec CTAs
- [ ] **Documentation**
  - Guide utilisateur complet
  - Tutoriel onboarding
  - Documentation API (si extraction en lib)
  - Contributing guide
- [ ] **Testing**
  - Coverage > 85% globale
  - E2E tests critiques (Playwright?)
  - Performance testing
- [ ] **Deployment**
  - CI/CD pipeline
  - Production build optimisé
  - Analytics (optionnel)

**Estimé Phase 3**: **6 sprints** (Sprint 15-20) après Phase 2

---

## 🏗️ Phase 4 : Advanced K8s & Infrastructure (Nice-to-Have)

**Objectif**: Features avancées pour utilisateurs expérimentés et formation CKA/CKS niveau expert

### Sprint 21 : Nodes Management & Scheduling 📚 BASSE

**Objectif**: Simulation multi-node et scheduling avancé

- [ ] **Node Model**
  - `src/cluster/models/Node.ts` - Factory pour Nodes
  - Capacity: CPU, memory, pods limit
  - Status: Ready, NotReady, SchedulingDisabled
  - Labels et taints
- [ ] **Multi-Node Simulation**
  - 3-5 nodes virtuels (master + workers)
  - Pod placement par node
  - Resource tracking per node
- [ ] **Taints & Tolerations**
  - Node taints (NoSchedule, PreferNoSchedule, NoExecute)
  - Pod tolerations matching
  - Eviction simulation
- [ ] **Node Selectors & Affinity**
  - nodeSelector simple
  - Node affinity (required, preferred)
  - Pod affinity/anti-affinity
- [ ] **kubectl Commands**
  - `kubectl get nodes`
  - `kubectl describe node <name>`
  - `kubectl drain <node>` - évacuer pods
  - `kubectl cordon/uncordon <node>` - disable/enable scheduling
- [ ] ~35-40 tests

**Définition de Done**:
- ✅ 3+ nodes simulés
- ✅ Scheduling respecte taints/tolerations
- ✅ Node affinity fonctionne
- ✅ `kubectl drain` évacue les pods

---

### Sprint 22 : CoreDNS & Service Discovery 📚 BASSE

**Objectif**: DNS interne et découverte de services

- [ ] **CoreDNS Simulation**
  - `src/cluster/components/CoreDNS.ts` - DNS resolver
  - Format: `<service>.<namespace>.svc.cluster.local`
  - A records pour services (ClusterIP)
  - SRV records pour ports nommés
- [ ] **DNS Resolution dans kubectl exec**
  - Commande `nslookup` dans exec shell
  - Commande `dig` simulation
  - Résolution automatique service names
- [ ] **Service Discovery Testing**
  - Exemples de debugging DNS
  - Scenarios avec problèmes DNS (service not found)
- [ ] ~15-20 tests

**Définition de Done**:
- ✅ DNS resolution `<service>.<namespace>.svc.cluster.local` fonctionne
- ✅ `nslookup` dans `kubectl exec` résout services
- ✅ Scenarios debugging DNS disponibles

---

### Sprint 23 : kubectl debug & Ephemeral Containers 📚 BASSE

**Objectif**: Debugging moderne (K8s 1.23+)

- [ ] **Ephemeral Containers**
  - Containers temporaires attachés à pod running
  - Ne redémarrent pas le pod
  - Utilisés uniquement pour debugging
- [ ] **kubectl debug**
  - `kubectl debug <pod> -it --image=busybox` - attach ephemeral container
  - `kubectl debug <pod> --copy-to=<new-pod>` - copie pod pour debugging
  - `kubectl debug node/<node>` - debug node via pod
- [ ] **Debug Scenarios**
  - Attach debugger à pod sans restart
  - Debug pod crashlooping sans modifier manifest
- [ ] ~15-20 tests

**Définition de Done**:
- ✅ Ephemeral containers attachables
- ✅ `kubectl debug` fonctionne (attach mode)
- ✅ Copy-to-debug crée pod copie

---

### Sprint 24 : Control Plane Visualization 📚 BASSE

**Objectif**: Comprendre architecture K8s (pédagogique)

- [ ] **Control Plane Components (read-only)**
  - kube-apiserver
  - etcd (key-value store)
  - kube-scheduler
  - kube-controller-manager
  - cloud-controller-manager
- [ ] **Worker Components**
  - kubelet
  - kube-proxy
  - container runtime
- [ ] **Visualization Panel**
  - Diagram architecture K8s
  - Highlight component lors d'actions
  - Flow visualization: create pod → scheduler → kubelet → container
- [ ] **Educational Mode**
  - Tooltips expliquant rôle de chaque composant
  - Logs simulés des composants (pedagogical)
  - Quiz sur architecture
- [ ] ~10-15 tests

**Définition de Done**:
- ✅ Diagram control plane visible
- ✅ Highlight components lors d'actions
- ✅ Tooltips éducatifs
- ✅ Mode visualisation toggle

---

### Sprint 25 : Container Basics & Docker Concepts 📚 BASSE (optionnel)

**Objectif**: Enseigner les bases des containers (hors-scope K8s mais pédagogique)

- [ ] **Container Concepts Panel**
  - Qu'est-ce qu'un container vs VM
  - Images et layers
  - Registries (Docker Hub, etc.)
  - Tags et versioning
- [ ] **Simulated Docker Commands** (shell context)
  - `docker ps` - list running containers (affiche pods)
  - `docker images` - list images (affiche registry)
  - `docker logs <container>` - alias vers kubectl logs
  - Message: "In Kubernetes, use kubectl instead"
- [ ] **Interactive Lesson**
  - Lesson: "Containers 101"
  - Comparaison Docker vs Kubernetes
  - Migration Docker Compose → K8s manifests
- [ ] ~10-15 tests

**Définition de Done**:
- ✅ Lesson "Containers 101" disponible
- ✅ Quelques commandes docker simulées (pédagogiques)
- ✅ Comparaison Docker/K8s claire

---

### Sprint 26 : Advanced Features & Differentiators 🎯

**Objectif**: Features uniques pour se démarquer

- [ ] **Scenario Recording/Replay**
  - Enregistrer session utilisateur
  - Replay automatique avec annotations
  - Export/import scenarios
  - Partage via URL (encoded state)
- [ ] **Time-Travel Debugging**
  - Historique états cluster (snapshots)
  - Rewind vers état précédent
  - Compare states (diff view)
  - Undo/redo actions
- [ ] **YAML Diff Viewer**
  - `kubectl apply -f` montre diff avant apply
  - Highlight changements (add/remove/modify)
  - Preview mode avec confirmation
- [ ] **Collaborative Mode** (ambitieux)
  - Partage état cluster via URL
  - Real-time collaboration (optionnel)
  - Session export/import
- [ ] **Integrated YAML Generator/Wizard**
  - UI wizard pour créer manifests
  - Forms → generate YAML
  - Templates pré-configurés
  - Validation temps réel
- [ ] ~25-30 tests

**Définition de Done**:
- ✅ Recording/replay fonctionne
- ✅ Time-travel avec undo/redo
- ✅ Diff viewer sur kubectl apply
- ✅ Au moins 1 feature collaborative

**Estimé Phase 4**: **6 sprints** (Sprint 21-26) après Phase 3

---

## 📊 Résumé Global des Phases

| Phase | Sprints | Focus | Estimé | Priorité |
|-------|---------|-------|---------|----------|
| **MVP (Phase 1)** | Sprint 1-6 | Core features (Terminal, FileSystem, kubectl basics, Storage) | 6 sprints | 🔥 CRITIQUE |
| **Phase 2** | Sprint 7-14 | Advanced K8s Resources (PV/PVC, Jobs, RBAC, HPA, etc.) | 8 sprints | ⭐ HAUTE |
| **Phase 3** | Sprint 15-20 | Learning Platform (Chaos, Challenges, Lessons, Visualizer) | 6 sprints | ⭐ HAUTE |
| **Phase 4** | Sprint 21-26 | Advanced Infrastructure (Nodes, CoreDNS, Control Plane, Differentiators) | 6 sprints | 📚 BASSE |
| **TOTAL** | **26 sprints** | Full-featured K8s Learning Platform | **~26 sprints** | - |

### Must-Have pour rivaliser avec KodeKloud/Killer.sh
- ✅ **Sprint 5**: ConfigMaps, Secrets, kubectl exec, Resource limits, Probes
- ✅ **Sprint 7-10**: Multi-container, PV/PVC, Jobs, kubectl rollout/port-forward
- ✅ **Sprint 15-17**: Chaos engineering, Challenges, Lessons

### Nice-to-Have (différenciateurs)
- ✅ **Sprint 15**: Chaos Engineering GUI (unique!)
- ✅ **Sprint 26**: Time-travel debugging, Scenario recording, YAML wizard

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
- **Result types centralisés** : `src/shared/result.ts` avec helpers `success()` / `error()`
- Pattern Unix-like : Success = stdout, Error = stderr
- Immutabilité complète (Object.freeze)
- Types TypeScript stricts
- Command routing via object lookup (pas de switch)
- Conventions de commentaires structurels (2-3 niveaux)

**À appliquer pour tous les nouveaux modules**.

---

## 🔧 Refactorings Complétés

### Centralisation des Result Types (Octobre 2025)

**Problème identifié** : 5 types Result dupliqués + ~100 lignes de boilerplate manuel

**Solution** : Fichier central `src/shared/result.ts`

**Impact** :
- Types centralisés : `Result<T>`, `ExecutionResult = Result<string>`
- Helpers : `success()`, `error()` (2 fonctions au lieu de 5+)
- Pattern Unix-like : success = stdout, error = stderr
- Supprimé type spécial `'clear'` → traité comme commande normale
- Unifié `output` → `data` partout

**Fichiers refactorisés** (8 fichiers) :
- `src/filesystem/FileSystem.ts`
- `src/cluster/ClusterState.ts`
- `src/kubectl/commands/parser.ts`
- `src/kubectl/commands/executor.ts`
- `src/kubectl/commands/handlers/*.ts`
- `src/shell/commands/parser.ts`
- `src/shell/commands/executor.ts`
- `src/main.ts`

**Tests** : ✅ 265/265 passent (100% compatibility)
