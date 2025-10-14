# 🔧 Guide de Refactoring

Ce document liste les règles et bonnes pratiques à appliquer lors du refactoring du code.

---

## 📐 Architecture & Principes

### Functional Programming
- ✅ **Éviter les classes**, préférer les **factory functions** avec closures
- ✅ **Pure functions** pour la logique métier (pas de side effects)
- ✅ **Immutabilité** : utiliser `Object.freeze()` sur les objets de domaine
- ✅ **Discriminated unions** pour les résultats (`Result<T, E>`)
- ❌ **Pas d'exceptions** : toujours retourner `{ type: 'success' | 'error' }`

### KISS & DRY
- ✅ Keep It Simple, Stupid
- ✅ Don't Repeat Yourself
- ✅ Extraire la duplication en fonctions réutilisables
- ❌ Pas de sur-ingénierie

### Clean Architecture
- ✅ Séparation des responsabilités (1 fonction = 1 responsabilité)
- ✅ Découplage : modules indépendants et testables
- ✅ Injection de dépendances via closures (`getState`, `setState`)
- ✅ Library-First Design : pas de dépendances entre modules génériques (filesystem/shell/terminal) et modules applicatifs (kubectl/cluster)

---

## 🎯 Structure du Code

### Indentation & Contrôle de flux
- ✅ **Indentation max : 3 niveaux**
- ❌ **Pas de switch statements** : utiliser des maps/objects ou if/else linéaires
- ❌ **Pas de if imbriqués** : utiliser early returns
- ✅ **Aplatir le code** : guard clauses en premier

**Exemple - Avant (mauvais)** :
```typescript
function doSomething(value: string) {
    if (value) {
        if (value.length > 0) {
            if (isValid(value)) {
                return process(value)
            } else {
                return error('Invalid')
            }
        } else {
            return error('Empty')
        }
    } else {
        return error('Null')
    }
}
```

**Exemple - Après (bon)** :
```typescript
function doSomething(value: string) {
    if (!value) return error('Null')
    if (value.length === 0) return error('Empty')
    if (!isValid(value)) return error('Invalid')
    
    return process(value)
}
```

### Longueur des fonctions
- ✅ **Fonctions courtes** : max 20-30 lignes idéalement
- ✅ Si une fonction fait plus de 50 lignes, **découper en sous-fonctions**
- ✅ Si une factory function retourne trop de méthodes (>10), **grouper en sous-factories**

**Exemple - Avant (trop long)** :
```typescript
export const createFileSystem = () => {
    // 150 lignes de code...
}
```

**Exemple - Après (découpé)** :
```typescript
const createNavigationOps = (getState, setState) => ({ /* 30 lignes */ })
const createFileOps = (getState) => ({ /* 40 lignes */ })
const createDirectoryOps = (getState) => ({ /* 30 lignes */ })

export const createFileSystem = () => {
    const getState = () => state
    const setState = (s) => { state = s }
    
    return {
        ...createNavigationOps(getState, setState),
        ...createFileOps(getState),
        ...createDirectoryOps(getState)
    }
}
```

---

## 📝 Conventions de Commentaires

### Commentaires Structurels (Organisation)
- ✅ Utiliser **3 niveaux de sections** pour organiser visuellement le code
- ✅ Toujours au **niveau root** (colonne 0), jamais indentés
- ✅ **Longueur standard : 79 caractères**

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// NIVEAU 1 : SECTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Niveau 2 : Sous-section
// ───────────────────────────────────────────────────────────────────────────

// ─── Niveau 3 : Sous-sous-section (optionnel, si 3+ fonctions liées) ──────
```

**Quand utiliser chaque niveau** :
- **Niveau 1** : Grandes sections du fichier (TYPES, PATH OPERATIONS, FACTORY, etc.)
- **Niveau 2** : Groupes logiques de fonctions (Resolution, Validation, Mutation, etc.)
- **Niveau 3** : Subdivision d'un grand groupe (3+ fonctions liées uniquement)

### Commentaires Explicatifs

#### ✅ À FAIRE

1. **JSDoc pour les exports publics**
   ```typescript
   /**
    * Parse kubectl command string into structured object
    * @param input - Raw command (e.g., "kubectl get pods -n default")
    * @returns Parsed command or error
    */
   export const parseCommand = (input: string): ParseResult => { /* ... */ }
   ```

2. **Expliquer les comportements Kubernetes**
   ```typescript
   // Kubernetes behavior: Pods default to 'default' namespace when unspecified
   const namespace = parsed.namespace || 'default'
   ```

3. **Documenter les contraintes de la spec**
   ```typescript
   // Max depth 3 prevents filesystem over-complexity (spec requirement)
   if (getDepth(path) > 3) return error
   ```

4. **Clarifier les edge cases**
   ```typescript
   // Cannot go above root - stay at root level
   if (parts.length === 0 && part === '..') continue
   ```

5. **Signaler les side effects**
   ```typescript
   // Side effect: Mutates parent.children Map
   parent.children.set(name, node)
   ```

6. **TODOs avec phase et contexte**
   ```typescript
   // TODO(Phase 2): Implement truly immutable tree with structural sharing
   ```

#### ❌ À ÉVITER

1. **Commentaires redondants** (qui répètent le code)
   ```typescript
   // ❌ BAD
   // Increment counter by 1
   counter++
   
   // ✅ GOOD
   counter++
   ```

2. **Code commenté** : Utiliser git pour l'historique
   ```typescript
   // ❌ BAD
   // const oldFunction = () => { ... }
   ```

3. **Séparateurs indentés** : Toujours en colonne 0
   ```typescript
   // ❌ BAD
   function myFunc() {
       // ════════════════════════
       // Section inside function
       // ════════════════════════
   }
   
   // ✅ GOOD
   // ═══════════════════════════════════════════════════════════════════════════
   // SECTION NAME
   // ═══════════════════════════════════════════════════════════════════════════
   
   function myFunc() {
       // Regular comment explaining logic
   }
   ```

---

## 🏷️ Nommage

### Variables & Fonctions
- ✅ **Noms explicites**, même s'ils sont longs
- ✅ **Préférer la clarté à la concision**
- ✅ **Pas d'abréviations obscures**

```typescript
// ❌ BAD
const usr = getUsr()
const fn = calcTtl()
const tmp = proc(data)

// ✅ GOOD
const currentUser = getCurrentUser()
const totalPrice = calculateTotalPrice()
const processedData = processUserData(data)
```

### Constantes & Configuration
- ✅ **SCREAMING_SNAKE_CASE** pour les constantes magiques
- ✅ **camelCase** pour les configs

```typescript
// ✅ GOOD
const MAX_DEPTH = 3
const MAX_LOG_ENTRIES = 500
const FORBIDDEN_CHARS = /[\s*?<>|]/

const config = {
    maxRetries: 3,
    timeout: 5000
}
```

### Fonctions de validation
- ✅ Préfixer par `validate`, `is`, `has`, `can`

```typescript
// ✅ GOOD
const validateFilename = (name: string): boolean => { /* ... */ }
const isValidExtension = (ext: string): boolean => { /* ... */ }
const hasPermission = (user: User): boolean => { /* ... */ }
const canDelete = (path: string): boolean => { /* ... */ }
```

---

## 🔄 Refactoring de Factory Functions

### Pattern recommandé

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// HELPER FACTORIES (groupe les méthodes liées)
// ═══════════════════════════════════════════════════════════════════════════

const createNavigationOps = (getState: () => State, setState: (s: State) => void) => ({
    getCurrentPath: () => getState().currentPath,
    
    changeDirectory: (path: string) => {
        // Logic here
    }
})

const createFileOps = (getState: () => State) => ({
    readFile: (path: string) => { /* ... */ },
    writeFile: (path: string, content: string) => { /* ... */ }
})

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export const createMyModule = (initialState?: State) => {
    let state: State = initialState || defaultState
    
    const getState = () => state
    const setState = (newState: State) => { state = newState }
    
    return {
        ...createNavigationOps(getState, setState),
        ...createFileOps(getState)
    }
}
```

### Injection de dépendances

```typescript
// ✅ GOOD: Inject dependencies via closures
export const createExecutor = (
    clusterState: ClusterState,
    fileSystem: FileSystem,
    logger: Logger
) => {
    const execute = (cmd: Command) => {
        logger.info('EXECUTOR', `Executing: ${cmd.action}`)
        // Use clusterState and fileSystem
    }
    
    return { execute }
}

// ❌ BAD: Hard-coded dependencies
export const createExecutor = () => {
    const clusterState = createClusterState() // Hard-coded!
    const execute = (cmd: Command) => { /* ... */ }
    return { execute }
}
```

---

## ✅ Validation & Error Handling

### Discriminated Unions
- ✅ Toujours utiliser `Result<T, E>` pour les opérations faillibles
- ❌ Jamais throw d'exceptions

```typescript
// ✅ GOOD
type Result<T, E> = 
    | { type: 'success'; data: T }
    | { type: 'error'; message: E }

const readFile = (path: string): Result<string, string> => {
    if (!exists(path)) {
        return { type: 'error', message: 'File not found' }
    }
    return { type: 'success', data: content }
}

// ❌ BAD
const readFile = (path: string): string => {
    if (!exists(path)) {
        throw new Error('File not found') // Don't throw!
    }
    return content
}
```

### Early Returns pour Validation
- ✅ Valider en premier, traiter ensuite
- ✅ Extraire validations complexes en fonctions dédiées

```typescript
// ✅ GOOD
const createFile = (name: string): Result<File, string> => {
    const validation = validateFileCreation(name, path, tree)
    if (validation.type === 'error') return validation
    
    // Happy path
    const file = createFile(name, path)
    return { type: 'success', data: file }
}

// ❌ BAD
const createFile = (name: string): Result<File, string> => {
    if (validateFilename(name)) {
        if (checkDepth(path)) {
            if (!exists(path)) {
                // Happy path deeply nested
                const file = createFile(name, path)
                return { type: 'success', data: file }
            } else {
                return error('Exists')
            }
        } else {
            return error('Depth')
        }
    } else {
        return error('Invalid')
    }
}
```

---

## 🧪 Testabilité

### Pure Functions = Easy Testing
- ✅ Extraire la logique en **pure functions**
- ✅ Side effects isolés dans la factory
- ✅ Pas de dépendances cachées

```typescript
// ✅ GOOD: Pure function - easy to test
export const resolvePath = (currentPath: string, targetPath: string): string => {
    if (targetPath.startsWith('/')) return normalizePath(targetPath)
    // Logic without side effects
    return resolved
}

// Test simple:
expect(resolvePath('/home', '../etc')).toBe('/etc')

// ❌ BAD: Hard to test (hidden dependencies)
const resolvePath = (targetPath: string): string => {
    const currentPath = getCurrentPath() // Hidden dependency!
    // Logic...
}
```

### Factory avec State Testable
- ✅ Accepter `initialState` en paramètre
- ✅ Fournir `toJSON()` pour inspection d'état

```typescript
// ✅ GOOD
export const createFileSystem = (initialState?: FileSystemState) => {
    let state = initialState || defaultState
    
    return {
        // ... methods
        toJSON: () => state // Testable!
    }
}

// Test:
const fs = createFileSystem({ currentPath: '/test', tree })
fs.changeDirectory('subdir')
expect(fs.toJSON().currentPath).toBe('/test/subdir')
```

---

## 🎨 Organisation des Fichiers

### Structure recommandée

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════

import { ... } from './models'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface State { ... }
export type Result<T, E> = ...

// ═══════════════════════════════════════════════════════════════════════════
// PURE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Validation
// ───────────────────────────────────────────────────────────────────────────

export const validateX = () => { ... }

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

const helperFunction = () => { ... }

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FACTORIES (si factory complexe)
// ═══════════════════════════════════════════════════════════════════════════

const createSubModule1 = () => ({ ... })
const createSubModule2 = () => ({ ... })

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export const createMainModule = () => { ... }
```

---

## 🚫 Anti-Patterns à Éviter

### ❌ Mutation cachée
```typescript
// ❌ BAD
const processArray = (arr: number[]) => {
    arr.push(42) // Mutation!
    return arr
}

// ✅ GOOD
const processArray = (arr: number[]): number[] => {
    return [...arr, 42] // New array
}
```

### ❌ Side effects dans pure functions
```typescript
// ❌ BAD
export const calculateTotal = (items: Item[]): number => {
    console.log('Calculating...') // Side effect!
    saveToDatabase(items) // Side effect!
    return items.reduce((sum, item) => sum + item.price, 0)
}

// ✅ GOOD
export const calculateTotal = (items: Item[]): number => {
    return items.reduce((sum, item) => sum + item.price, 0)
}
```

### ❌ God Functions
```typescript
// ❌ BAD: Function fait trop de choses
const processUserData = (user: User) => {
    // Validate (20 lines)
    // Transform (30 lines)
    // Save to DB (15 lines)
    // Send email (20 lines)
    // Log (10 lines)
    // Update cache (15 lines)
} // 110 lignes!

// ✅ GOOD: Découper en fonctions focused
const processUserData = (user: User) => {
    const validation = validateUser(user)
    if (validation.type === 'error') return validation
    
    const transformed = transformUserData(user)
    const saved = saveToDatabase(transformed)
    sendWelcomeEmail(user)
    updateCache(user)
    
    return saved
}
```

### ❌ Boolean parameters
```typescript
// ❌ BAD: Unclear what true/false means
deleteFile('/path', true, false, true)

// ✅ GOOD: Named parameters
deleteFile('/path', { 
    recursive: true, 
    force: false, 
    backup: true 
})
```

---

## 📋 Checklist de Refactoring

Avant de considérer le refactoring terminé, vérifier :

- [ ] **Architecture**
  - [ ] Functional programming (factory + pure functions)
  - [ ] Pas de classes inutiles
  - [ ] Immutabilité respectée
  - [ ] Discriminated unions pour errors

- [ ] **Structure**
  - [ ] Indentation max 3 niveaux
  - [ ] Pas de if imbriqués (early returns)
  - [ ] Pas de switch statements
  - [ ] Fonctions courtes (<50 lignes)

- [ ] **Commentaires**
  - [ ] Sections visuelles (niveau 1, 2, 3)
  - [ ] JSDoc sur exports publics
  - [ ] Side effects documentés
  - [ ] Pas de code commenté

- [ ] **Nommage**
  - [ ] Noms de variables explicites
  - [ ] Pas d'abréviations obscures
  - [ ] Fonctions de validation préfixées (is, has, can, validate)

- [ ] **Testabilité**
  - [ ] Pure functions extraites
  - [ ] Injection de dépendances
  - [ ] initialState accepté en paramètre
  - [ ] toJSON() disponible si stateful

- [ ] **Qualité**
  - [ ] Pas de duplication (DRY)
  - [ ] Découplage (modules indépendants)
  - [ ] Tous les tests passent
  - [ ] Pas de linter errors

---

## 🔍 Outils

```bash
# Vérifier les tests
npm test

# Coverage
npm run coverage

# Linter
npm run lint  # (si configuré)

# Build
npm run build
```

---

## 📚 Références

- `doc/spec.md` - Spécifications du projet
- `doc/roadmap.md` - Roadmap et architecture patterns

