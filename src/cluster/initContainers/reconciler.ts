// ═══════════════════════════════════════════════════════════════════════════
// INIT CONTAINER RECONCILER
// ═══════════════════════════════════════════════════════════════════════════
// Orchestrates init container execution in sequential order
// Pure function that processes all init containers and updates pod state

import type { Pod } from '../ressources/Pod'
import { executeInitContainer } from './executor'
import { createImageRegistry } from '../../containers/registry/ImageRegistry'

// ─── Helper Functions ────────────────────────────────────────────────────

/**
 * Check if image is valid in registry
 */
const isImageValid = (image: string): boolean => {
    const registry = createImageRegistry()
    const result = registry.validateImage(image)
    return result.ok
}

/**
 * Update container status in pod
 */
const updateContainerStatus = (
    pod: Pod,
    containerName: string,
    updates: { state?: 'Waiting' | 'Running' | 'Terminated'; ready?: boolean; fileSystem?: any }
): Pod => {
    const updatedStatuses = pod.status.containerStatuses?.map(cs => {
        if (cs.name === containerName) {
            return {
                ...cs,
                ...updates,
            }
        }
        return cs
    })

    return {
        ...pod,
        status: {
            ...pod.status,
            containerStatuses: updatedStatuses,
        },
    }
}

/**
 * Update pod phase
 */
const updatePodPhase = (pod: Pod, phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown'): Pod => {
    return {
        ...pod,
        status: {
            ...pod.status,
            phase,
        },
    }
}

/**
 * Mark all regular containers as Running
 */
const startRegularContainers = (pod: Pod): Pod => {
    let updatedPod = pod

    const regularContainers = pod.status.containerStatuses?.filter(cs => cs.containerType === 'regular') || []

    for (const container of regularContainers) {
        updatedPod = updateContainerStatus(updatedPod, container.name, {
            state: 'Running',
            ready: true,
        })
    }

    return updatedPod
}

// ─── Main Reconciler ─────────────────────────────────────────────────────

/**
 * Reconcile init containers and return updated pod
 * Processes init containers sequentially, stopping on first failure
 */
export const reconcileInitContainers = (pod: Pod): Pod => {
    // No init containers - just start regular containers
    if (!pod.spec.initContainers || pod.spec.initContainers.length === 0) {
        const updatedPod = startRegularContainers(pod)
        return updatePodPhase(updatedPod, 'Running')
    }

    let currentPod = pod

    // Process each init container sequentially
    for (const initContainer of pod.spec.initContainers) {
        // Validate image
        if (!isImageValid(initContainer.image)) {
            // Mark init container as Terminated (failed)
            currentPod = updateContainerStatus(currentPod, initContainer.name, {
                state: 'Terminated',
            })

            // Mark pod as Failed
            return updatePodPhase(currentPod, 'Failed')
        }

        // Get current filesystem for this init container
        const initStatus = currentPod.status.containerStatuses?.find(cs => cs.name === initContainer.name)
        if (!initStatus) {
            // Should not happen, but handle gracefully
            return updatePodPhase(currentPod, 'Failed')
        }

        // Execute init container
        const result = executeInitContainer(initContainer, initStatus.fileSystem)

        if (!result.ok) {
            // Execution failed - mark as Terminated and fail pod
            currentPod = updateContainerStatus(currentPod, initContainer.name, {
                state: 'Terminated',
            })

            return updatePodPhase(currentPod, 'Failed')
        }

        // Success - update filesystem and mark as Terminated (success)
        currentPod = updateContainerStatus(currentPod, initContainer.name, {
            state: 'Terminated',
            fileSystem: result.value,
        })
    }

    // All init containers succeeded - start regular containers
    currentPod = startRegularContainers(currentPod)

    return updatePodPhase(currentPod, 'Running')
}

