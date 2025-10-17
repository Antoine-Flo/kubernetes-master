# Coding Conventions - Kube Simulator

## Programming Paradigm

### Functional Programming
- ✅ Factory functions with closures for state
- ✅ Pure functions for business logic
- ✅ Immutability with `Object.freeze()`
- ✅ Discriminated unions for results
- ❌ No classes (use factory functions)
- ❌ No exceptions (use Result types)

### KISS & DRY
- Keep code simple and readable
- Extract duplication into reusable functions
- Avoid over-engineering
- One function = one responsibility

## Code Structure

### Indentation & Control Flow
- **Max indentation**: 3 levels
- **No switch statements**: Use object lookup or if/else
- **No nested ifs**: Use early returns (guard clauses)
- **Always use braces**: Even for one-liners

**Example**:
```typescript
// ❌ BAD: Nested ifs
if (value) {
  if (value.length > 0) {
    if (isValid(value)) {
      return process(value)
    }
  }
}

// ✅ GOOD: Early returns
if (!value) {
    return error('Null')
}
if (value.length === 0) {
    return error('Empty')
}
if (!isValid(value)) {
    return error('Invalid')
}
return process(value)
```

### Function Length
- **Ideal**: 20-30 lines
- **Max**: 50 lines before splitting
- Extract long functions into smaller ones
- Group related methods into sub-factories

## Naming Conventions

### Variables & Functions
- **Explicit names** over abbreviations
- **Clarity** over conciseness
- Avoid obscure abbreviations

```typescript
// ❌ BAD
const usr = getUsr()
const fn = calcTtl()

// ✅ GOOD
const currentUser = getCurrentUser()
const totalPrice = calculateTotalPrice()
```

### Constants
- **SCREAMING_SNAKE_CASE** for magic values
- **camelCase** for config objects

```typescript
const MAX_DEPTH = 3
const MAX_LOG_ENTRIES = 500
const FORBIDDEN_CHARS = /[\s*?<>|]/

const config = {
  maxRetries: 3,
  timeout: 5000
}
```

### Validation Functions
- Prefix with `validate`, `is`, `has`, `can`

```typescript
const validateFilename = (name: string): boolean => { }
const isValidExtension = (ext: string): boolean => { }
const hasPermission = (user: User): boolean => { }
```

## Comment Conventions

### Structural Comments
```typescript
// ═══════════════════════════════════════════════════════════════════════════
// MODULE NAME
// ═══════════════════════════════════════════════════════════════════════════
// Brief description of module purpose (2-3 lines).
// Key responsibilities and behaviors.

export const mainFunction = () => { }
```

**For central files only** (ClusterState, FileSystem, main.ts):
```typescript
// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                      MODULE NAME                                      ║
// ╚═══════════════════════════════════════════════════════════════════════╝
```

**Subsections** (if >8 functions):
```typescript
// ─── Subsection Name ─────────────────────────────────────────────────────

export const func1 = () => { }
export const func2 = () => { }
```

### Explanatory Comments

**Do comment**:
- JSDoc for public exports
- Kubernetes behaviors
- Spec constraints
- Edge cases
- Side effects
- TODOs with context

**Don't comment**:
- Obvious code
- Commented-out code (use git)
- Redundant explanations

```typescript
// ✅ GOOD
// Kubernetes behavior: Pods default to 'default' namespace when unspecified
const namespace = parsed.namespace || 'default'

// Max depth 3 prevents filesystem over-complexity (spec requirement)
if (getDepth(path) > 3) {
    return error('Max depth exceeded')
}

// TODO(Phase 2): Implement immutable tree with structural sharing
```

## Factory Function Pattern

```typescript
// Helper factories for complex modules
const createNavigationOps = (getState, setState) => ({
  getCurrentPath: () => getState().currentPath,
  changeDirectory: (path) => { /* logic */ }
})

const createFileOps = (getState) => ({
  readFile: (path) => { /* logic */ },
  writeFile: (path, content) => { /* logic */ }
})

// Main factory
export const createFileSystem = (initialState?) => {
  let state = initialState || defaultState
  
  const getState = () => state
  const setState = (newState) => { state = newState }
  
  return {
    ...createNavigationOps(getState, setState),
    ...createFileOps(getState),
    toJSON: () => state
  }
}
```

### Dependency Injection
```typescript
// ✅ GOOD: Inject dependencies
export const createExecutor = (
  clusterState: ClusterState,
  fileSystem: FileSystem,
  logger: Logger
) => {
  const execute = (cmd) => { /* use dependencies */ }
  return { execute }
}

// ❌ BAD: Hard-coded dependencies
export const createExecutor = () => {
  const clusterState = createClusterState()  // Hard-coded!
}
```

## Error Handling

### Result Types
```typescript
// Always use Result<T> for failable operations
export type Result<T> = 
  | { type: 'success'; data: T }
  | { type: 'error'; message: string }

const readFile = (path: string): Result<string> => {
  if (!exists(path)) return error('File not found')
  return success(content)
}

// ❌ Never throw exceptions
```

### Early Returns for Validation
```typescript
const createFile = (name: string): Result<File> => {
  const validation = validateFileCreation(name, path, tree)
  if (validation.type === 'error') return validation
  
  // Happy path
  const file = createFileNode(name, path)
  return success(file)
}
```

## Testability

### Pure Functions
```typescript
// ✅ GOOD: Pure function - easy to test
export const resolvePath = (
  currentPath: string, 
  targetPath: string
): string => {
  if (targetPath.startsWith('/')) return normalizePath(targetPath)
  return resolved
}

// Test:
expect(resolvePath('/home', '../etc')).toBe('/etc')
```

### Factory with Initial State
```typescript
// ✅ GOOD: Testable factory
export const createModule = (initialState?) => {
  let state = initialState || defaultState
  return {
    // methods
    toJSON: () => state  // For testing
  }
}

// Test:
const module = createModule({ currentPath: '/test' })
module.changeDirectory('subdir')
expect(module.toJSON().currentPath).toBe('/test/subdir')
```

## File Organization

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════

import { } from './models'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface State { }
export type Result<T> = 

// ═══════════════════════════════════════════════════════════════════════════
// PURE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const validateX = () => { }

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export const createModule = () => { }
```

## Anti-Patterns to Avoid

### Hidden Mutation
```typescript
// ❌ BAD
const process = (arr: number[]) => {
  arr.push(42)  // Mutation!
  return arr
}

// ✅ GOOD
const process = (arr: number[]): number[] => {
  return [...arr, 42]
}
```

### Side Effects in Pure Functions
```typescript
// ❌ BAD
export const calculate = (items: Item[]): number => {
  console.log('Calculating...')  // Side effect!
  saveToDatabase(items)           // Side effect!
  return total
}

// ✅ GOOD
export const calculate = (items: Item[]): number => {
  return items.reduce((sum, item) => sum + item.price, 0)
}
```

### Boolean Parameters
```typescript
// ❌ BAD: Unclear meaning
deleteFile('/path', true, false, true)

// ✅ GOOD: Named parameters
deleteFile('/path', { 
  recursive: true, 
  force: false, 
  backup: true 
})
```

## Testing Strategy

- **Pure functions**: Simple tests, no setup
- **Factory functions**: Tests with setup/teardown
- **Coverage goal**: >80% for all modules
- **TDD workflow**: Red → Green → Refactor

## Tools

```bash
npm test              # Run tests
npm run coverage      # Coverage report
npm run dev           # Dev server
npm run build         # Production build
```

## References

- See `ARCHITECTURE.md` for patterns and structure
- See `SPEC.md` for requirements
- See `docv1/refactoring.md` for detailed examples (archived)

