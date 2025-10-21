import type { Result } from '../../shared/result'
import { success, error } from '../../shared/result'

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║                      STORAGE ADAPTER (LOCALSTORAGE)                   ║
// ╚═══════════════════════════════════════════════════════════════════════╝
// Generic storage adapter for persisting application state to localStorage.
// Handles serialization/deserialization with Map support and quota errors.

export interface StorageAdapter {
    save: <T>(key: string, data: T) => Result<void>
    load: <T>(key: string) => Result<T>
    clear: (key: string) => Result<void>
    clearAll: () => Result<void>
}

/**
 * Serialize data to JSON string
 * Handles Map objects by converting to array of entries
 */
const serialize = <T>(data: T): Result<string> => {
    try {
        const json = JSON.stringify(data, (_key, value) => {
            // Convert Map to array for JSON serialization
            if (value instanceof Map) {
                return {
                    __type: 'Map',
                    entries: Array.from(value.entries()),
                }
            }
            return value
        })
        return success(json)
    } catch (err) {
        return error(`Serialization failed: ${(err as Error).message}`)
    }
}

/**
 * Deserialize JSON string to typed data
 * Reconstructs Map objects from serialized entries
 */
const deserialize = <T>(json: string): Result<T> => {
    try {
        const data = JSON.parse(json, (_key, value) => {
            // Reconstruct Map from serialized entries
            if (value && typeof value === 'object' && value.__type === 'Map') {
                return new Map(value.entries)
            }
            return value
        })
        return success(data)
    } catch (err) {
        return error(`Deserialization failed: ${(err as Error).message}`)
    }
}

/**
 * Create localStorage adapter with error handling
 */
export const createStorageAdapter = (): StorageAdapter => {
    const save = <T>(key: string, data: T): Result<void> => {
        const serialized = serialize(data)
        if (!serialized.ok) {
            return serialized
        }

        try {
            localStorage.setItem(key, serialized.value)
            return success(undefined)
        } catch (err) {
            // Handle quota exceeded or other storage errors
            if (err instanceof Error && err.name === 'QuotaExceededError') {
                return error('Storage quota exceeded')
            }
            return error(`Storage save failed: ${(err as Error).message}`)
        }
    }

    const load = <T>(key: string): Result<T> => {
        try {
            const json = localStorage.getItem(key)

            if (json === null) {
                return error(`No data found for key: ${key}`)
            }

            return deserialize<T>(json)
        } catch (err) {
            return error(`Storage load failed: ${(err as Error).message}`)
        }
    }

    const clear = (key: string): Result<void> => {
        try {
            localStorage.removeItem(key)
            return success(undefined)
        } catch (err) {
            return error(`Storage clear failed: ${(err as Error).message}`)
        }
    }

    const clearAll = (): Result<void> => {
        try {
            localStorage.clear()
            return success(undefined)
        } catch (err) {
            return error(`Storage clear all failed: ${(err as Error).message}`)
        }
    }

    return {
        save,
        load,
        clear,
        clearAll,
    }
}

