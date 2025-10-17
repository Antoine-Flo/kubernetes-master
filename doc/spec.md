# Specification - Kube Simulator

## Vision

Interactive web application for learning `kubectl` commands through a simulated terminal with a stateful virtual Kubernetes cluster.

## Project Objectives

### Phase 1: MVP
- Functional terminal with xterm.js (centered, styled)
- Basic kubectl command interpreter (get, describe, delete, create, apply, logs)
- Stateful virtual cluster (namespaces, pods, deployments, services)
- Local persistence (localStorage)
- Virtual filesystem for YAML manifests
- Core resources: Pods, Deployments, Services, Namespaces, ConfigMaps, Secrets

### Phase 2: Enhanced Features
- Kubernetes controllers simulation (reconciliation loops)
- Advanced resources (PV/PVC, Jobs, StatefulSets, RBAC)
- Terminal enhancements (syntax highlighting, YAML editor)
- Dynamic resource generation
- Failure simulation and restarts
- Metrics and simulated logs

### Phase 3: Learning Platform
- **Challenges System**: Pre-configured scenarios with seed clusters
- **Lessons UI**: Pedagogical interface with text, explanations, progress tracking
- **Visual Cluster**: Graphical representation of cluster state
- **Chaos Engineering**: GUI for disaster recovery training

## Core Features

### kubectl Commands (Phase 1)

| Command | Description |
|---------|-------------|
| `kubectl get pods` | List pods |
| `kubectl get pods -n <ns>` | List pods by namespace |
| `kubectl get deployments/services/configmaps/secrets` | List resources |
| `kubectl describe <type> <name>` | Show resource details |
| `kubectl delete <type> <name>` | Delete resource |
| `kubectl create -f <file>` | Create from YAML |
| `kubectl apply -f <file>` | Apply YAML manifest |
| `kubectl logs <pod>` | Show pod logs |
| `kubectl logs <pod> -n <ns>` | Logs with namespace |
| `kubectl exec -it <pod> -- <cmd>` | Execute command in pod |

### Shell Commands (Phase 1)

| Command | Description |
|---------|-------------|
| `pwd` | Show current directory |
| `ls`, `ls -l` | List files/directories |
| `cd <path>` | Change directory |
| `mkdir <dir>`, `mkdir -p <path>` | Create directory |
| `touch <file>` | Create empty file |
| `cat <file>` | Display file content |
| `rm <file>`, `rm -r <dir>` | Remove files/directories |
| `clear` | Clear terminal |
| `help` | Show help |
| `debug` | Show application logs |

### Terminal Features

- **Command history**: Navigate with ↑↓ (max 100 commands)
- **Tab autocompletion**: Bash-like autocomplete for commands, resources, files, flags
- **Enhanced prompt**: Format `☸ ~/path>` with dynamic path
- **Persistent state**: Cluster and filesystem saved to localStorage

## User Capabilities

### 1. Explore Pre-configured Cluster
- View existing pods, deployments, services
- Inspect resource details with `describe`
- Check pod logs
- Navigate namespaces

### 2. Manage Filesystem
- Navigate virtual filesystem (max 3 levels depth)
- Create directories and YAML files
- View file contents
- Organize manifests in folders

### 3. Create and Apply Resources
- Write YAML manifests
- Apply manifests to cluster: `kubectl apply -f <file>`
- See resources created in real-time
- Modify and reapply configurations

### 4. Debug and Troubleshoot
- Check pod status and events
- View container logs
- Execute commands in pods (`kubectl exec`)
- Use `debug` command for application logs

### 5. Experiment Safely
- All operations are local and isolated
- Reset cluster to seed state
- No risk of breaking real systems
- Immediate feedback

## Data Models

### Cluster State
```typescript
interface ClusterState {
  namespaces: Namespace[]
  pods: Pod[]
  deployments: Deployment[]
  services: Service[]
  configMaps: ConfigMap[]
  secrets: Secret[]
}
```

### Filesystem State
```typescript
interface FileSystemState {
  currentPath: string
  tree: DirectoryNode
}
```

### Filesystem Constraints
- **Max depth**: 3 levels (root + 3)
- **Allowed extensions**: `.yaml`, `.yml`, `.json`, `.kyaml`
- **Forbidden characters**: `*`, `?`, `<`, `>`, `|`, spaces
- **Path format**: Unix-style (`/path/to/file`)

## Seed Data

### Initial Cluster
- Namespaces: `default`, `kube-system`
- Sample pods (nginx, redis, etc.)
- 1-2 deployments
- 1-2 services
- Sample configmaps and secrets

### Initial Filesystem
```
/ (root)
├── examples/
│   ├── pod-example.yaml
│   ├── deployment-example.yaml
│   └── service-example.yaml
└── manifests/
    └── (empty - user workspace)
```

## UI Layout

### Phase 1 (MVP)
- Terminal centered horizontally and vertically
- Responsive width (max-width for readability)
- Dark theme (daisyUI)
- Registry panel: Display available container images

### Phase 3 (Learning Platform)
- **Split-view modes**:
  - Terminal only (full screen)
  - Learning mode (terminal + lesson panel)
  - Challenge mode (terminal + objectives)
  - Visual mode (terminal + cluster visualizer)
- **Components**: Cards, progress bars, badges, accordions
- **Responsive**: Mobile/tablet support

## Success Criteria (MVP)

- ✅ Terminal functional and styled
- ✅ Command history with ↑↓ navigation
- ✅ Tab autocompletion working
- ✅ Enhanced prompt with ☸ icon and path
- ✅ 9+ kubectl commands supported
- ✅ Shell commands functional (cd, ls, pwd, mkdir, touch, cat, rm)
- ✅ Virtual filesystem with max 3 levels
- ✅ Cluster persists between sessions
- ✅ kubectl + filesystem integration (`apply -f path/to/file.yaml`)
- ✅ Simulated logs for pods
- ✅ Application logs accessible via `debug`
- ✅ Test coverage > 80%
- ✅ TypeScript strict mode
- ✅ Modular architecture
- ✅ Clear error messages
- ✅ Minimal dependencies

## References

- See `ARCHITECTURE.md` for technical structure
- See `CONVENTIONS.md` for coding standards
- See `ROADMAP.md` for development phases
- See `DECISIONS.md` for technical choices

