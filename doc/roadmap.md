# Roadmap - Kube Simulator

## Current Status

**975 tests passing** | **~89% coverage** | **Phase 1 MVP Complete** ✅

**Architecture**: Functional (Factory + Pure functions + ADT + Event Sourcing)

## ✅ Phase 1 MVP - Completed (Sprints 1-6)

**Terminal & Core kubectl**
- Terminal xterm.js avec historique de commandes et autocomplétion
- kubectl commands: get, describe, delete, create, apply, logs, exec, label, annotate
- Cluster simulé avec Pods, Deployments, Services, ConfigMaps, Secrets, Namespaces

**Filesystem & Shell**
- Virtual filesystem avec commandes: cd, ls, pwd, mkdir, touch, cat, rm, nano
- Éditeur YAML intégré (CodeMirror 6)

**Persistence & UX**
- localStorage avec auto-save
- Command history, tab autocompletion, enhanced prompt
- Registry panel UI avec liste d'images disponibles
- Reset button (cluster/filesystem/all)
- Messages d'erreur authentiques (kubectl + shell)

## 🚀 Next: Phase 2 - Advanced Kubernetes (Sprints 7-14)

## Phase 2: Advanced Kubernetes

### Sprint 7: Multi-Container Pods & Init Containers
- Multiple containers per pod
- Init containers with execution order
- Shared volumes (emptyDir)
- Sidecar patterns

### Sprint 8: Storage (PV/PVC) & StatefulSets
- PersistentVolume and PersistentVolumeClaim
- Binding logic (match PV to PVC)
- StatefulSets with ordered pods
- Stable network identities

### Sprint 9: Workloads - Jobs, CronJobs, DaemonSets
- Jobs with completions tracking
- CronJobs with schedule parsing
- DaemonSets (one pod per node)

### Sprint 10: kubectl Advanced Commands
- kubectl rollout (status, history, undo, pause/resume)
- kubectl port-forward (simulation)
- kubectl top (CPU/memory metrics)
- kubectl config (contexts, kubeconfig)
- Multi-resource support (e.g., `kubectl get pods,services`)

### Sprint 11: Security & Networking
- RBAC (Roles, ClusterRoles, Bindings)
- kubectl auth can-i
- Ingress with routing rules
- NetworkPolicies

### Sprint 12: Autoscaling & Resource Quotas
- HorizontalPodAutoscaler (HPA)
- ResourceQuotas per namespace
- LimitRanges with defaults

### Sprint 13: Terminal Enhancements
- Syntax highlighting (real-time)
- Enhanced prompt (contextual)

### Sprint 14: Real Registry + Chaos Hooks
- Fetch from Docker Hub API
- Fallback to hardcoded registry
- Chaos infrastructure in models

## Phase 3: Learning Platform

### Sprint 15: Chaos Engineering System
- Chaos GUI panel
- Scenarios: ImagePullBackOff, CrashLoopBackOff, NetworkFailure, OOM
- Custom scenario builder
- Scheduler (immediate or delayed)

### Sprint 16: Challenges System
- Pre-configured challenge scenarios
- Automatic validation
- Progressive hints (3-5 per challenge)
- Challenge UI with objectives panel

### Sprint 17: Lessons System
- Interactive tutorials (theory + practice)
- Lessons: Pods, Deployments, Services, ConfigMaps, Storage, Troubleshooting
- Exercise validation
- Progress tracking

### Sprint 18: Cluster Visualizer
- 3 modes: Tree view, Cards grid, Graph view
- Real-time sync with terminal
- Visual status indicators

### Sprint 19: Layout Manager & Integration
- Mode switcher: Terminal Only, Learning, Challenge, Visual
- Responsive layouts
- Gamification (optional): Achievements, XP, badges

### Sprint 20: Polish & Documentation
- UI polish (animations, loading, empty states)
- User guide and onboarding
- Coverage >85%
- E2E tests

## Phase 4: Advanced Infrastructure

**Priority: Low** - Nice-to-have for advanced users

### Sprint 21: Nodes Management & Scheduling
- Multi-node simulation (3-5 nodes)
- Taints & tolerations
- Node affinity/anti-affinity
- kubectl drain/cordon

### Sprint 22: CoreDNS & Service Discovery
- DNS resolver simulation
- nslookup/dig in kubectl exec
- Service discovery patterns

### Sprint 23: kubectl debug & Ephemeral Containers
- Ephemeral containers
- kubectl debug attach mode
- Copy-to-debug pod creation

### Sprint 24: Control Plane Visualization
- Diagram of K8s architecture
- Component highlighting during actions
- Educational tooltips

### Sprint 25: Container Basics (Optional)
- Container vs VM lesson
- Simulated docker commands
- Docker to K8s migration guide

### Sprint 26: Advanced Differentiators
- Scenario recording/replay
- Time-travel debugging (undo/redo)
- YAML diff viewer
- Collaborative mode (share via URL)
- YAML wizard/generator

## Summary

| Phase             | Sprints        | Focus                                      | Priority |
| ----------------- | -------------- | ------------------------------------------ | -------- |
| **MVP (Phase 1)** | 1-6            | Core features (Terminal, kubectl, Storage) | ⭐⭐⭐      |
| **Phase 2**       | 7-14           | Advanced K8s resources                     | ⭐⭐       |
| **Phase 3**       | 15-20          | Learning platform                          | ⭐⭐       |
| **Phase 4**       | 21-26          | Advanced infrastructure                    | ⭐        |
| **TOTAL**         | **26 sprints** | Full K8s learning platform                 | -        |

## Must-Have Features

Pour rivaliser avec KodeKloud/Killer.sh:
- ✅ Phase 1: Terminal complet, kubectl core, Filesystem, Persistence
- 🎯 Phase 2 (Sprint 7-14): Multi-container, PV/PVC, Jobs, kubectl avancé
- 🎯 Phase 3 (Sprint 15-20): Chaos engineering, Challenges, Lessons

## Unique Differentiators

- Chaos Engineering GUI avec scenarios configurables
- Time-travel debugging et scenario recording/replay
- Architecture 100% fonctionnelle (pas d'OOP)

## TDD Workflow

For each feature:
1. **RED**: Write failing test
2. **GREEN**: Implement minimum to pass
3. **REFACTOR**: Clean up code
4. **VERIFY**: Run tests + knip to ensure no dead code
5. **COMMIT**: Clear commit message
6. **REPEAT**: Next feature

Code quality checks (automated in `npm test`):
- Unit tests (vitest)
- Dead code detection (knip)
- Type checking (tsc)
- Linting (eslint with strict TypeScript rules)

## Commands

```bash
npm run dev        # Dev server
npm test           # Run tests (includes knip, lint, and unit tests)
npm run test:unit  # Run unit tests only
npm run coverage   # Coverage report
npm run knip       # Check for unused code
npm run lint       # Lint code with ESLint
npm run lint:fix   # Auto-fix linting issues
npm run build      # Production build
npm run tsc        # Type check
```

## References

- See `SPEC.md` for feature details
- See `ARCHITECTURE.md` for technical structure
- See `CONVENTIONS.md` for coding standards
- See `DECISIONS.md` for technical choices

