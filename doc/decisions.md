# Technical Decisions - Kube Simulator

## Decision Log Format

| Date | Decision | Reason | Impact |
|------|----------|--------|--------|

## Phase 1 (MVP) Decisions

| Date | Decision | Reason | Impact |
|------|----------|--------|--------|
| 2025-Q4 | **Vitest** for testing | Native Vite integration, TypeScript support, fast | Excellent DX, 617 tests, 94% coverage |
| 2025-Q4 | **localStorage** for persistence | Simple, synchronous, sufficient for MVP | Fast implementation, upgrade to IndexedDB in Phase 2 |
| 2025-Q4 | **js-yaml** for YAML parsing | Standard library, well-maintained, small | kubectl apply/create work with YAML files |
| 2025-Q4 | **TypeScript strict mode** | Catch errors early, better IDE support | High code quality, reduced bugs |
| 2025-Q4 | **Functional programming** over classes | Testability, simplicity, composability | Easier to test, maintain, and reason about |
| 2025-Q4 | **Factory functions** with closures | State encapsulation without classes | Clean API, dependency injection, testable |
| 2025-Q4 | **Result types** (no exceptions) | Explicit error handling, type-safe | Predictable control flow, better errors |
| 2025-Q4 | **No switch statements** | Object lookup is more maintainable | Easier to extend, less nesting |
| 2025-Q4 | **Max indentation: 3 levels** | Readability, forces function extraction | Cleaner code, smaller functions |
| 2025-Q4 | **Minimal dependencies** | Reduce bundle size, fewer security issues | Fast loading, simpler maintenance |
| 2025-Q4 | **daisyUI** for UI framework | Beautiful components, Tailwind-based, minimal JS | Modern UI with minimal effort |
| 2025-Q4 | **xterm.js** for terminal | Industry standard, feature-rich, active | Realistic terminal experience |
| 2025-Q4 | **Virtual filesystem** max depth 3 | Prevent complexity, easy to visualize | Simple mental model for learners |
| 2025-Q4 | **Logs stored in Pod model** | Matches K8s behavior, simple to implement | Realistic kubectl logs experience |
| 2025-Q4 | **Application logs in-memory** | No persistence needed, debug tool only | Fast, simple, auto-cleanup |
| 2025-Q4 | **Tab autocompletion** (Sprint 4.10) | Essential for good UX, matches real terminals | Faster command entry, better learning |
| 2025-Q4 | **No YAML editor in MVP** | Complex, time-consuming, not critical | Defer to Phase 2, focus on core features |

## Phase 2 Decisions (Planned)

| Date | Decision | Reason | Impact |
|------|----------|--------|--------|
| TBD | **IndexedDB** if localStorage insufficient | Larger storage capacity, async API | Handle larger clusters and more data |
| TBD | **Terminal YAML editor** (nano-like) | In-terminal editing matches kubectl edit | Native experience without external editor |
| TBD | **Real registry integration** (Docker Hub API) | More realistic, up-to-date images | Better training, but needs offline fallback |
| TBD | **Syntax highlighting** in terminal | Better UX, immediate feedback | Easier to spot errors before execution |
| TBD | **Enhanced prompt** with context | Show namespace, context, status | More informative, matches real kubectl |

## Phase 3 Decisions (Planned)

| Date | Decision | Reason | Impact |
|------|----------|--------|--------|
| TBD | **Chaos Engineering GUI** | Unique differentiator, disaster recovery training | Stand out from competitors |
| TBD | **Challenges system** | Practical learning, automatic validation | Engaging, measurable progress |
| TBD | **Lessons with interactive UI** | Guided learning for beginners | Lower barrier to entry |
| TBD | **Cluster visualizer** | Visual learners benefit, better understanding | Complement terminal experience |
| TBD | **Multiple layout modes** | Different learning styles and contexts | Flexible platform for various use cases |

## Architecture Decisions

| Date | Decision | Reason | Impact |
|------|----------|--------|--------|
| 2025-Q4 | **Library-First Design** | Generic modules reusable outside project | FileSystem/Shell can be extracted as libraries |
| 2025-Q4 | **Event Sourcing** for logger | Immutable event log, easy to replay | Time-travel debugging possible in Phase 4 |
| 2025-Q4 | **Observer Pattern** for logging | Decouple logging from business logic | Clean separation, console mirroring in dev |
| 2025-Q4 | **Command Pattern** for routing | Extensible, testable, no switch statements | Easy to add new commands |
| 2025-Q4 | **Discriminated Unions** (ADT) | Type-safe state machines, exhaustive checks | Compiler catches unhandled cases |
| 2025-Q4 | **Centralized Result types** (shared/result.ts) | Consistency, helper functions, DRY | Unified error handling across codebase |
| 2025-Q4 | **Repository pattern** for resources | Abstract CRUD operations, testable | Easier to add new resource types |

## Rejected Alternatives

| Alternative | Reason for Rejection | Decision Made |
|-------------|---------------------|---------------|
| **Classes** | Harder to test, unnecessary complexity | Factory functions |
| **Exceptions** | Implicit control flow, hard to track | Result types |
| **Redux/State management library** | Overkill for MVP, adds complexity | Closure-based state |
| **React/Vue/Svelte** | Unnecessary for terminal-focused app | Vanilla TypeScript |
| **WebAssembly for K8s simulation** | Over-engineering, complexity | Pure TypeScript |
| **Real K8s API** | Too heavy, defeats learning purpose | Simulated cluster |
| **Monaco Editor** for YAML | Large bundle, complex integration | Terminal-based editor (Phase 2) |
| **Webpack** | Slower than Vite, more config | Vite |
| **Jest** | Slower than Vitest, less Vite integration | Vitest |

## Design Constraints

| Constraint | Justification |
|------------|---------------|
| **Max 3 levels filesystem depth** | Prevent over-complexity, easy to visualize |
| **Max 200 log entries per pod** | Prevent memory bloat, realistic rotation |
| **Max 500 application log entries** | Debug tool only, no persistence needed |
| **No real network calls in MVP** | Offline-first, predictable, fast |
| **No authentication** | Learning tool, not production system |
| **Single-user only** | Simplicity, no need for multi-user in MVP |

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **Test coverage** | >80% | ~94% |
| **Test count** | >200 | 617 |
| **Bundle size** | <500KB | TBD |
| **Load time** | <2s | TBD |
| **Browser support** | Modern browsers (ES2020+) | ✅ |

## Future Considerations

- **Real Docker Hub integration**: Fetch actual image metadata
- **Multi-user collaborative mode**: Share cluster state via URL
- **Time-travel debugging**: Replay command history
- **Export/import scenarios**: Share training scenarios
- **VS Code extension**: Integrated terminal experience
- **Mobile app**: Native iOS/Android app with touch UI

## References

- See `SPEC.md` for feature decisions
- See `ARCHITECTURE.md` for pattern decisions
- See `ROADMAP.md` for timeline decisions
- See `CONVENTIONS.md` for code style decisions

