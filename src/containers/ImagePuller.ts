import type { PodPhase } from '../cluster/models/Pod'
import type { ImageRegistry } from './registry/ImageRegistry'

// ═══════════════════════════════════════════════════════════════════════════
// IMAGE PULL SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════

export interface PullEvent {
    event: 'Pulling' | 'Pulled' | 'Created' | 'Started'
    message: string
    timestamp: string
}

export interface PullResult {
    type: 'success' | 'error'
    status: PodPhase
    events?: PullEvent[]
    message?: string
}

export const simulateImagePull = (
    imageString: string,
    registry: ImageRegistry
): PullResult => {
    const validationResult = registry.validateImage(imageString)

    // Handle validation errors
    if (validationResult.type === 'error') {
        return {
            type: 'error',
            status: 'Pending',
            message: `Failed to pull image "${imageString}"\n${validationResult.message}`,
        }
    }

    const image = validationResult.data
    const parseResult = registry.parseImageString(imageString)

    if (parseResult.type === 'error') {
        return {
            type: 'error',
            status: 'Pending',
            message: parseResult.message,
        }
    }

    const parsed = parseResult.data
    const imageRef = `${parsed.registry}/${parsed.name}:${parsed.tag}`

    // Generate pull events
    const now = new Date().toISOString()
    const events: PullEvent[] = [
        {
            event: 'Pulling',
            message: `Pulling image "${imageRef}"`,
            timestamp: now,
        },
        {
            event: 'Pulled',
            message: `Successfully pulled "${imageRef}"`,
            timestamp: now,
        },
        {
            event: 'Created',
            message: 'Created container',
            timestamp: now,
        },
        {
            event: 'Started',
            message: 'Started container',
            timestamp: now,
        },
    ]

    return {
        type: 'success',
        status: image.behavior.defaultStatus,
        events,
    }
}

