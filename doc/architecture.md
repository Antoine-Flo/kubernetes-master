# Architecture - Kube Simulator

## Tech Stack

- **Frontend**: HTML5, TypeScript, CSS
- **Terminal**: xterm.js
- **Build**: Vite
- **UI Framework**: daisyUI (Tailwind CSS)
- **Tests**: Vitest + jsdom
- **Persistence**: localStorage (Phase 1), IndexedDB (Phase 2+)
- **YAML Parser**: js-yaml

## Architectural Principles

- **KISS**: Keep It Simple, Stupid
- **DRY**: Don't Repeat Yourself
- **Functional Programming**: Pure functions, no classes
- **Design Patterns**: Factory functions, Result pattern, Command pattern, Observer pattern
- **Max Indentation**: 3 levels
- **No switch statements**: Use object lookup or if/else
- **Library-First Design**: Generic, reusable modules
- **Testable**: Dependency injection, inversion of control

## Core Patterns

### Result Types (Error Handling)
```typescript
// src/shared/result.ts
export type Result<T, E = string> = 
  | { ok: true; value: T }
  | { ok: false; error: E }

export const success = <T>(value: T): Result<T> => ({ ok: true, value })
export const error = (message: string): Result<never> => ({ ok: false, error: message })

// Example usage
const result = findPod(state, 'nginx', 'default')
if (result.ok) {
  console.log(result.value.metadata.name)
} else {
  console.error(result.error)
}
```

**Pattern**: Discriminated union (like Fetch API). Unix-like: Success = stdout, Error = stderr

### Factory Functions (State Management)
```typescript
export const createModule = (initialState?: State) => {
  let state = initialState || defaultState
  
  return {
    method1: () => { /* use/modify state */ },
    method2: () => { /* use/modify state */ },
    toJSON: () => ({ ...state })
  }
}
```

**Purpose**: Encapsulate mutable state with closures

### Pure Functions (Business Logic)
```typescript
export const calculateAge = (timestamp: string): string => {
  const now = new Date()
  const created = new Date(timestamp)
  const diffMs = now.getTime() - created.getTime()
  return `${Math.floor(diffMs / 60000)}m`
}
```

**Characteristics**: No side effects, testable, predictable

### Command Pattern
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

**Purpose**: Replace if/switch chains with object lookup

## Module Structure

```
src/
├── kubectl/                    # kubectl simulation
│   ├── commands/
│   │   ├── parser.ts           # Parse kubectl commands
│   │   ├── executor.ts         # Execute commands
│   │   └── handlers/           # Handlers per command
│   │       ├── get.ts
│   │       ├── describe.ts
│   │       ├── delete.ts
│   │       ├── create.ts
│   │       ├── apply.ts
│   │       └── logs.ts
│   └── formatters/
│       └── describeFormatters.ts
│
├── cluster/                    # Kubernetes cluster
│   ├── ClusterState.ts         # Cluster state factory
│   ├── probeSimulator.ts       # Health probe simulator
│   ├── ressources/             # Kubernetes resource models
│   │   ├── Pod.ts
│   │   ├── ConfigMap.ts
│   │   └── Secret.ts
│   ├── repositories/           # Resource CRUD
│   │   ├── resourceRepository.ts
│   │   └── types.ts
│   ├── seedCluster.ts          # Initial data
│   └── storage/                # Persistence
│
├── containers/
│   ├── ImagePuller.ts          # Pull simulation
│   └── registry/
│       ├── ImageRegistry.ts    # Registry with validation
│       └── seedRegistry.ts     # Available images
│
├── filesystem/                 # Virtual filesystem
│   ├── FileSystem.ts           # Filesystem state factory
│   ├── models/
│   │   ├── File.ts             # File factory
│   │   └── Directory.ts        # Directory factory
│   └── seedFileSystem.ts       # Initial structure
│
├── logger/                     # Application logging
│   ├── Logger.ts               # Logger factory
│   └── types.ts
│
├── shell/                      # Shell commands
│   ├── commands/
│   │   ├── parser.ts           # Parse shell commands
│   │   └── executor.ts         # Execute commands
│
├── terminal/
│   ├── TerminalManager.ts      # xterm.js wrapper
│   └── autocomplete.ts         # Tab completion
│
├── shared/                     # Shared utilities
│   ├── result.ts               # Result types
│   ├── formatter.ts            # Output formatters
│   ├── parsing.ts              # Parse utilities
│   └── deepFreeze.ts           # Immutability
│
└── main.ts                     # Entry point
```

## Data Models

### Pod
```typescript
interface Pod {
  apiVersion: 'v1'
  kind: 'Pod'
  metadata: {
    name: string
    namespace: string
    labels?: Record<string, string>
    annotations?: Record<string, string>
  }
  spec: {
    containers: Container[]
    volumes?: Volume[]
  }
  status: {
    phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown'
    conditions?: Condition[]
    containerStatuses?: ContainerStatus[]
    logs?: LogEntry[]
  }
}
```

### Container
```typescript
interface Container {
  name: string
  image: string
  ports?: ContainerPort[]
  env?: EnvVar[]
  volumeMounts?: VolumeMount[]
  resources?: ResourceRequirements
  livenessProbe?: Probe
  readinessProbe?: Probe
}
```

### ConfigMap & Secret
```typescript
interface ConfigMap {
  apiVersion: 'v1'
  kind: 'ConfigMap'
  metadata: Metadata
  data: Record<string, string>
}

interface Secret {
  apiVersion: 'v1'
  kind: 'Secret'
  metadata: Metadata
  type: string
  data: Record<string, string>  // base64 encoded
}
```

### Filesystem Node
```typescript
interface DirectoryNode {
  type: 'directory'
  name: string
  path: string
  children: Map<string, FileSystemNode>
}

interface FileNode {
  type: 'file'
  name: string
  path: string
  content: string
  createdAt: string
  modifiedAt: string
}

type FileSystemNode = DirectoryNode | FileNode
```

## Image Registry

### Registry Structure
```typescript
interface ImageManifest {
  name: string              // "nginx", "redis"
  registry: string          // "docker.io/library"
  tags: string[]            // ["latest", "1.25"]
  description: string
  defaultPorts: number[]
  behavior: {
    startupTime: number
    logGenerator: (pod: Pod) => LogEntry[]
    defaultStatus: PodPhase
  }
}
```

### Available Images (MVP)
- `nginx`: HTTP server (Running)
- `redis`: Data store (Running)
- `postgres`: SQL database (Running)
- `mysql`: SQL database (Running)
- `busybox`: Minimal image (Succeeded)
- `broken-app`: Training image (CrashLoopBackOff)
- `private-image`: Auth failure simulation (ImagePullBackOff)

### Image Validation
- Unknown image → Error with available images list
- Invalid tag → Error with valid tags
- Format validation: `[registry/]name[:tag]`

## Logging System

### Container Logs (kubectl logs)
```typescript
interface LogEntry {
  timestamp: string
  stream: 'stdout' | 'stderr'
  message: string
}
```

**Storage**: Stored in Pod.status.logs  
**Rotation**: Max 200 lines per pod (FIFO)  
**Persistence**: Saved with ClusterState

### Application Logs (debug)
```typescript
interface ApplicationLogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  category: 'COMMAND' | 'EXECUTOR' | 'FILESYSTEM' | 'CLUSTER'
  message: string
}
```

**Storage**: In-memory only  
**Rotation**: Max 500 entries (FIFO)  
**Access**: Via `debug` command  
**Dev Mirror**: Logs also visible in browser console

## Dependencies

**Runtime**:
- xterm.js - Terminal emulator
- js-yaml - YAML parsing
- daisyUI - UI components

**Development**:
- Vite - Build tool
- Vitest - Testing framework
- TypeScript - Type safety

**Philosophy**: Minimal dependencies, prefer web platform APIs

## References

- See `SPEC.md` for feature details
- See `CONVENTIONS.md` for implementation patterns
- See `ROADMAP.md` for future architecture evolution

