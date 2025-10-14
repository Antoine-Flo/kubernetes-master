# 🚀 Kube Simulator

An interactive web-based terminal to practice and learn `kubectl` commands with a virtual Kubernetes cluster. Perfect for learning Kubernetes without needing a real cluster!

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Tests](https://img.shields.io/badge/tests-218%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-88.86%25-brightgreen)

---

## 🎯 Why Kube Simulator?

Learning Kubernetes can be challenging when you need:
- ✅ A **safe environment** to experiment without breaking things
- ✅ **No cloud costs** or local cluster overhead
- ✅ **Immediate feedback** on commands
- ✅ Ability to **reset and try again** instantly

This simulator provides a **risk-free playground** to master kubectl commands before touching production clusters.

---

## ✨ Current Features

- 🖥️ **Interactive Terminal** - Built with xterm.js, beautiful dark theme
- ☸️ **Virtual Kubernetes Cluster** - Stateful simulation in memory
- 📁 **Virtual File System** - Unix-like filesystem for YAML manifests
- ⚡ **Fast Feedback** - Instant command execution and validation
- 💾 **Persistence** - Coming soon (localStorage)
- 🧪 **Thoroughly Tested** - 218 tests, 88.86% coverage

---

## 📦 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd kube-simulator

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser at `http://localhost:5173` and start practicing!

---

## 🎮 Usage

### Basic Commands (Coming Soon)

```bash
# List all pods
kubectl get pods

# List pods in a namespace
kubectl get pods -n kube-system

# Describe a pod
kubectl describe pod nginx

# Delete a pod
kubectl delete pod nginx

# Apply a manifest
kubectl apply -f pod.yaml
```

### File System Navigation

```bash
# Navigate directories
cd /examples
ls
pwd

# View example manifests
cat pod-example.yaml

# Create your own
mkdir manifests
cd manifests
touch my-pod.yaml
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run coverage
```

---

## 🏗️ For Developers

This project follows **functional programming** principles with TypeScript:

- **Factory functions** instead of classes
- **Pure functions** for business logic
- **Immutability** with `Object.freeze()`
- **Discriminated unions** for error handling (no exceptions)
- **Test-Driven Development** (TDD)

### Project Structure

```
src/
├── kubectl/       # kubectl command simulation
├── cluster/       # Virtual Kubernetes cluster
├── filesystem/    # Virtual file system
├── terminal/      # xterm.js wrapper
└── main.ts        # Entry point
```

### Contributing

We welcome contributions! Please:
1. Follow functional programming patterns
2. Write tests first (TDD)
3. Maintain > 80% test coverage
4. Use TypeScript strict mode

See [doc/refactoring.md](doc/refactoring.md) for detailed code style guidelines.

---

## 📚 Documentation

- **[Specification](doc/spec.md)** - Technical details and architecture
- **[Roadmap](doc/roadmap.md)** - Development progress and planning
- **[Refactoring Guide](doc/refactoring.md)** - Code quality standards

---

## 🗺️ Roadmap

**Current Status**: Sprint 4.3/6 completed (MVP in progress)

- ✅ Terminal, Cluster, kubectl Parser/Executor, FileSystem
- 🔜 Shell Commands Integration
- 🔜 Image Registry & Logger
- 🔜 kubectl Handlers (get, describe, delete, apply)
- 🔜 Persistence & Polish → **MVP Launch**

See [roadmap.md](doc/roadmap.md) for detailed sprint planning.

---

## 🎓 Learning Resources

- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [xterm.js Documentation](https://xtermjs.org/)

---

## 📄 License

MIT License - Feel free to use this project for learning!

---

**Status**: 🚧 In active development - MVP Sprint 4.3/6 completed

Built with ❤️ for the Kubernetes learning community
