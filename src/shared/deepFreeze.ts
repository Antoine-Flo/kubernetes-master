// ═══════════════════════════════════════════════════════════════════════════
// DEEP FREEZE UTILITY
// ═══════════════════════════════════════════════════════════════════════════
// Recursively freezes objects and their nested properties for immutability

export const deepFreeze = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') {
        return obj
    }

    Object.keys(obj).forEach((prop) => {
        const value = (obj as any)[prop]
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value)
        }
    })

    return Object.freeze(obj)
}

