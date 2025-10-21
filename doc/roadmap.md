# Roadmap - Kube Simulator

## Current Status

**873 tests passing** | **~89% coverage** | **Architecture: Functional (Factory + Pure functions + ADT + Event Sourcing)**

## Completed Sprints

### Core Foundation
- ✅ Sprint 1: Terminal xterm.js (9 tests)
- ✅ Sprint 2: Pod model + ClusterState (43 tests)
- ✅ Sprint 3.1-3.3: kubectl Parser, Executor, Terminal Integration (65 tests)

### Filesystem & Shell
- ✅ Sprint 4.1-4.3: FileSystem Foundation (103 tests) - Library-ready design
- ✅ Sprint 4.4: Shell Parser + Executor (47 tests)
- ✅ Sprint 4.6: Shell Handlers - cd, ls, pwd, mkdir, touch, cat, rm (47 tests)

### Registry & Logging
- ✅ Sprint 4.5: Image Registry + Pull Simulation (25 tests)
- ✅ Sprint 4.7: Application Logger (21 tests) - Event Sourcing + Observer Pattern

### UX Enhancements
- ✅ Sprint 4.8: Command Dispatcher (8 tests) - Routing kubectl vs shell
- ✅ Sprint 4.9: Terminal UX - Command history + Enhanced prompt (12 tests)
- ✅ Sprint 4.10: Tab Autocompletion (61 tests) - Bash-like autocomplete

### Core Resources
- ✅ Sprint 5.1: Generic Formatter Module (54 tests)
- ✅ Sprint 5.2: ConfigMaps, Secrets, Pod enrichment (72 tests)
- ✅ Sprint 5.3: Get Handlers - configmaps/secrets with filters (21 tests)
- ✅ Sprint 5.4: Describe Handlers - pods, configmaps, secrets (23 tests)

### Code Quality & Refactoring
- ✅ **Result Pattern Migration** - `{type, data/message}` → `{ok, value/error}` (Fetch API style)
- ✅ **Sprint 5.5**: Apply/Create Handlers - YAML parser + kubectl apply/create (63 tests)
- ✅ **Handler Refactoring**: Configuration-driven pattern for kubectl handlers (describe.ts: 69→62 lines, -10% code duplication)
- ✅ **ClusterState Refactoring**: Generic factory pattern with `createResourceOperations` and `createFacadeMethods` helpers (304→213 lines, -30% code, eliminated repetitive CRUD operations)

### Editor Integration
- ✅ **Sprint 13 (Early)**: YAML Editor - CodeMirror 6 integration with nano command (25 tests)

### Advanced kubectl Commands
- ✅ **Sprint 5.6**: kubectl logs + exec (69 tests) - Dynamic log generation, tail/follow flags, interactive shell simulation, autocomplete
- ✅ **Sprint 5.7**: kubectl label & annotate (75 tests) - Add/remove labels and annotations, --overwrite flag support

### UI Enhancements
- ✅ **UI Polish**: Navigation bar with GitHub link, footer with useful links, SEO metadata - Minimalist and modern design

### Documentation
- ✅ **User-focused README**: Transformed README from developer-centric to user-friendly documentation with examples, FAQ, learning path
- ✅ **CONTRIBUTING.md**: Standard contribution guide with setup, coding standards, testing, and PR process

## Next Sprint

**Sprint 6** - Storage + Integration + Polish

See details in "Upcoming (Phase 1 - MVP)" section below.

## Upcoming (Phase 1 - MVP)

### Sprint 6: Storage + Integration + Polish

**6.1 - Storage Adapter**
- localStorage adapter factory
- Save/load ClusterState and FileSystem
- Auto-save on state changes

**6.2 - Integration**
- Orchestration in main.ts
- Load from storage or seed
- End-to-end tests

**6.3 - Error Handling & UX**
- Clear error messages
- help command
- reset command
- Graceful error handling

**6.4 - UI Polish**
- Registry panel (available images)
- Responsive design
- ANSI colors (green/red/yellow)
- Favicon and loading states

**6.5 - Documentation**
- README with examples
- Coverage >80%
- ~700+ tests total

## Backlog (Deferred Features)

**Sprint 5.8** - Dynamic Log Generator Enhancement
- Replace hardcoded log patterns with dynamic generation
- Context-aware logs based on pod state and events
- Realistic timestamps and log volume simulation
- Support for different log levels and formats

## Phase 2: Advanced Kubernetes (Sprints 7-14)

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

## Phase 3: Learning Platform (Sprints 15-20)

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

## Phase 4: Advanced Infrastructure (Sprints 21-26)

**Priority: Low** (Nice-to-have for advanced users)

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

| Phase | Sprints | Focus | Priority |
|-------|---------|-------|----------|
| **MVP (Phase 1)** | 1-6 | Core features (Terminal, kubectl, Storage) | ⭐⭐⭐ |
| **Phase 2** | 7-14 | Advanced K8s resources | ⭐⭐ |
| **Phase 3** | 15-20 | Learning platform | ⭐⭐ |
| **Phase 4** | 21-26 | Advanced infrastructure | ⭐ |
| **TOTAL** | **26 sprints** | Full K8s learning platform | - |

## Must-Have Features

To compete with KodeKloud/Killer.sh:
- ✅ Sprint 5: ConfigMaps, Secrets, kubectl exec, Resource limits, Probes
- ✅ Sprint 7-10: Multi-container, PV/PVC, Jobs, kubectl rollout/port-forward
- ✅ Sprint 15-17: Chaos engineering, Challenges, Lessons

## Unique Differentiators

- Sprint 15: Chaos Engineering GUI (unique!)
- Sprint 26: Time-travel debugging, Scenario recording

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

