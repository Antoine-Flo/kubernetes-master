import type { PodPhase } from '../cluster/ressources/Pod'
import type { ImageRegistry } from './registry/ImageRegistry'

// ═══════════════════════════════════════════════════════════════════════════
// IMAGE PULL SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════

interface PullEvent {
    event: 'Pulling' | 'Pulled' | 'Created' | 'Started'
    message: string
    timestamp: string
}

type PullResult =
    | { ok: true; status: PodPhase; events: PullEvent[] }
    | { ok: false; status: PodPhase; error: string }

export const simulateImagePull = (
    imageString: string,
    registry: ImageRegistry
): PullResult => {
    const validationResult = registry.validateImage(imageString)

    // Handle validation errors
    if (!validationResult.ok) {
        return {
            ok: false,
            status: 'Pending',
            error: `Failed to pull image "${imageString}"\n${validationResult.error}`,
        }
    }

    const image = validationResult.value
    const parseResult = registry.parseImageString(imageString)

    if (!parseResult.ok) {
        return {
            ok: false,
            status: 'Pending',
            error: parseResult.error,
        }
    }

    const parsed = parseResult.value
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
        ok: true,
        status: image.behavior.defaultStatus,
        events,
    }
}

