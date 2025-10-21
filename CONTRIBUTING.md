# 🤝 Contributing to Kube Simulator

Thank you for your interest in contributing! We welcome bug fixes, features, documentation improvements, and more.

> **💡 AI-Assisted Development**: This project is developed with AI assistance (Cursor/Claude). The `doc/` folder serves as the reference for AI code generation, ensuring consistency with architecture and conventions.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Git
- Basic knowledge of TypeScript and Kubernetes

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR-USERNAME/kubernetes-master.git
cd kubernetes-master

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (http://localhost:5173) |
| `npm test` | Run all tests (unit + knip + lint) |
| `npm run test:unit` | Run unit tests only |
| `npm run coverage` | Generate coverage report |
| `npm run build` | Production build |
| `npm run lint` | Lint code |
| `npm run lint:fix` | Auto-fix linting issues |

---

## 📁 Project Structure

```
src/
├── kubectl/          # kubectl command simulation
├── cluster/          # Virtual Kubernetes cluster
├── filesystem/       # Virtual Unix-like filesystem
├── shell/            # Shell commands (ls, cd, etc.)
├── editor/           # YAML editor integration
├── containers/       # Container registry simulation
├── terminal/         # Terminal management
├── logger/           # Application logging
├── shared/           # Reusable utilities
└── main.ts           # Application entry point

tests/
└── unit/             # Unit tests (mirrors src/)
```

---

## 💻 Coding Standards

- **Functional programming**: Factory functions, pure functions, immutability
- **Error handling**: Use Result types (`{ ok, value }` or `{ ok: false, error }`), no exceptions
- **Style**: Always use braces `{}`, max 3-level indentation, early returns
- **Naming**: camelCase for variables/functions, SCREAMING_SNAKE_CASE for constants

📖 See [doc/conventions.md](doc/conventions.md) for details.

---

## 🧪 Testing

We follow **Test-Driven Development** (TDD): Write test → Make it pass → Refactor

**Requirements**: Test new features, maintain >80% coverage (current: ~94%), all tests passing

```bash
npm test              # Run all tests
npm run coverage      # Generate coverage report
```

---

## 🔄 Pull Request Process

**Before submitting**:
1. Run `npm test` and `npm run tsc` (must pass)
2. Update docs if needed (roadmap.md, README.md)
3. Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
4. One feature/fix per PR, clear description

---

## 🎯 What to Contribute

- 🐛 Bug fixes, 📝 documentation, 🧪 test coverage
- ✨ Features (see [roadmap](doc/roadmap.md))
- 💬 Discuss first: Major changes, new dependencies, UI framework changes

---

## 📚 Documentation

- [Architecture](doc/architecture.md) - Design patterns and structure
- [Conventions](doc/conventions.md) - Detailed coding style guide
- [Specification](doc/spec.md) - Product requirements
- [Roadmap](doc/roadmap.md) - Development timeline
- [Decisions](doc/decisions.md) - Technical choices

---

## 💬 Questions?

- 🐛 [Report a Bug](https://github.com/Antoine-Flo/kubernetes-master/issues)
- 💡 [Request a Feature](https://github.com/Antoine-Flo/kubernetes-master/issues)
- 💬 [Discussions](https://github.com/Antoine-Flo/kubernetes-master/discussions)

---

**Thank you for contributing!** 🚀
