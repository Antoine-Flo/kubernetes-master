# 🚀 Kube Simulator

An interactive web-based terminal to practice and learn `kubectl` commands with a virtual Kubernetes cluster. Perfect for learning Kubernetes without needing a real cluster!

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Tests](https://img.shields.io/badge/tests-218%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-88.86%25-brightgreen)

## ✨ Features

### Current (MVP Phase - Sprint 4.3 Completed)
- ✅ **Interactive Terminal** - Built with xterm.js, beautiful dark theme
- ✅ **Virtual Cluster** - Stateful Kubernetes cluster simulation in memory
- ✅ **Pod Management** - Full CRUD operations on pods
- ✅ **kubectl Parser** - Command parsing with aliases and flags support
- ✅ **kubectl Executor** - Command routing and execution framework
- ✅ **Virtual FileSystem** - Unix-like filesystem with 3-level depth limit
  - Navigation (cd, pwd, ls)
  - File operations (touch, cat, rm)
  - Directory operations (mkdir, rm -r)
  - Multi-format support (.yaml, .yml, .json, .kyaml)
- ✅ **Realistic Data** - Pre-seeded cluster and filesystem with examples
- ✅ **88.86% Test Coverage** - 218 tests passing with TDD approach
- ✅ **Functional Architecture** - Factory functions, pure functions, closures

### Coming Soon (Sprint 4.4+)
- 🔜 **Shell Commands** - Full integration of cd, ls, mkdir, touch, cat, rm
- 🔜 **Image Registry** - Container image validation and pull simulation
- 🔜 **Application Logger** - Debug logs with command `debug`
- 🔜 **kubectl Handlers** - get, describe, delete, create, apply
- 🔜 **Persistence** - State saved in localStorage
- 🔜 **Formatted Output** - kubectl-style table formatting

### Future Enhancements (Phase 2)
- Command history (↑↓ navigation)
- Auto-completion (Tab)
- YAML support for `kubectl apply -f`
- Dynamic controllers (Deployment → ReplicaSet → Pods)
- Learning scenarios and challenges
- Visual cluster sidebar

## 🎯 Why This Project?

Learning Kubernetes can be challenging, especially when you need:
- A safe environment to experiment
- No cloud costs or local cluster overhead
- Immediate feedback on commands
- Ability to reset and try again

This simulator provides a **risk-free playground** to master kubectl commands before touching production clusters.

## 🏗️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Language** | TypeScript (strict mode) |
| **Terminal** | xterm.js |
| **UI Framework** | daisyUI + Tailwind CSS 4 |
| **Build Tool** | Vite |
| **Testing** | Vitest + jsdom |
| **Architecture** | Functional Programming (factory functions, pure functions, closures) |

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd kube-simulator

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm run coverage

# Run specific test suite
npm test -- tests/filesystem
```

**Test Coverage**: **218 tests passing** (88.86% coverage)
- **Terminal**: 7 tests
- **Cluster**: 43 tests (Pod model, ClusterState, seed data)
- **kubectl**: 57 tests (Parser, Executor, Integration)
- **FileSystem**: 103 tests (Models, operations, seed data)
- **Integration**: 8 tests (Terminal + kubectl)

## 🎮 Usage

Once the development server is running:

1. The terminal will display a welcome message
2. Type commands at the `kubectl>` prompt
3. Press Enter to execute (currently logs to console - Sprint 3 will add command processing)

### Planned Commands (Sprint 3+)

```bash
# List all pods
kubectl get pods

# List pods in a specific namespace
kubectl get pods -n kube-system

# Get detailed information about a pod
kubectl describe pod nginx

# Delete a pod
kubectl delete pod nginx

# List all resources
kubectl get all

# List namespaces
kubectl get namespaces
```

## 🏛️ Architecture

The project follows **functional programming principles** and **clean architecture**:

### Directory Structure

```
src/
├── kubectl/              # kubectl command simulation
│   ├── commands/
│   │   ├── parser.ts     # Parse kubectl commands (pure function)
│   │   ├── executor.ts   # Execute commands (factory function)
│   │   ├── types.ts      # Command types & interfaces
│   │   └── handlers/     # Command handlers (pure functions)
│   │       ├── get.ts
│   │       ├── describe.ts
│   │       ├── delete.ts
│   │       ├── create.ts
│   │       └── apply.ts
│   └── formatters/       # Output formatting (pure functions)
├── cluster/              # Kubernetes cluster simulation
│   ├── ClusterState.ts   # Cluster state management (hybrid: pure + facade)
│   ├── models/           # K8s resource models (factory functions)
│   │   └── Pod.ts
│   ├── seedCluster.ts    # Initial cluster data (pure function)
│   └── storage/          # Persistence layer
├── filesystem/           # Virtual filesystem (library-ready)
│   ├── FileSystem.ts     # Filesystem state & operations (factory function)
│   ├── models/           # File & Directory models (factory functions)
│   │   ├── File.ts       # Multi-format file support
│   │   ├── Directory.ts  # Directory node
│   │   └── index.ts      # Public exports
│   ├── seedFileSystem.ts # Initial filesystem structure
│   └── index.ts          # Public API
├── terminal/
│   └── TerminalManager.ts  # xterm.js wrapper (factory function)
└── main.ts               # Application entry point
```

### Design Principles

- **KISS** (Keep It Simple, Stupid)
- **DRY** (Don't Repeat Yourself)
- **Functional Programming** - Factory functions over classes, pure functions, closures for state
- **Immutability** - All data structures are frozen, operations return new copies
- **Type Safety** - TypeScript strict mode, discriminated unions for errors
- **Test-Driven Development** - Write tests first, then implementation
- **Clean Code Structure**
  - Maximum 3 levels of indentation
  - No switch statements (prefer object maps or if-else chains)
  - No nested if statements (use early returns)
  - Functions < 50 lines (extract helpers if needed)
  - Structured comments for visual organization (3-level hierarchy)
- **Library-First Design** - Generic modules (filesystem, terminal) decoupled from app-specific code (kubectl, cluster)

## 🗺️ Roadmap

- [x] **Sprint 1**: Terminal foundation (xterm.js integration, input handling) - 9 tests
- [x] **Sprint 2**: Cluster state (Pod model, ClusterState, seed data) - 43 tests
- [x] **Sprint 3.1-3.3**: kubectl Parser, Executor, Integration - 33 + 24 + 8 tests
- [x] **Sprint 4.1-4.3**: FileSystem Models, State, Seed - 103 tests
- [ ] **Sprint 4.4-4.8**: Shell Commands, Image Registry, Logger, Dispatcher
- [ ] **Sprint 5**: kubectl Handlers + Formatters
- [ ] **Sprint 6**: Integration, persistence, polish, and MVP launch

See [doc/roadmap.md](doc/roadmap.md) for detailed sprint planning and progress.

## 📚 Documentation

- [Specification](doc/spec.md) - Technical specification and architecture details
- [Roadmap](doc/roadmap.md) - Development progress and sprint planning
- [Refactoring Guide](doc/refactoring.md) - Code refactoring best practices and checklist

## 🧑‍💻 Development Workflow

This project follows **Test-Driven Development (TDD)**:

1. **RED** - Write a failing test
2. **GREEN** - Write minimal code to pass the test
3. **REFACTOR** - Clean up and optimize
4. **COMMIT** - Commit with a clear message
5. **REPEAT** - Next feature

### Code Style

- Prefer **functional programming** over OOP
- Use **factory functions** instead of classes
- Keep functions **pure** when possible
- Use **closures** for state encapsulation
- Return **typed results** (discriminated unions) instead of throwing exceptions
- Maintain **immutability** with `Object.freeze`

## 🤝 Contributing

This is a learning project following strict architectural principles. Contributions should:

1. Follow functional programming patterns (no classes)
2. Include tests (TDD approach)
3. Maintain > 80% test coverage
4. Use TypeScript strict mode
5. Follow the existing code style (max 3 levels indentation, no switch statements)

## 📄 License

MIT License - Feel free to use this project for learning!

## 🎓 Learning Resources

- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [xterm.js Documentation](https://xtermjs.org/)

---

**Status**: 🚧 In active development - MVP Sprint 4.3/6 completed (218 tests, 88.86% coverage)

**Next Up**: Sprint 4.4-4.8 - Shell Commands, Image Registry, Application Logger

Built with ❤️ for the Kubernetes learning community

