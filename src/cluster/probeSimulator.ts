// ═══════════════════════════════════════════════════════════════════════════
// PROBE SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════
// Pure functions to simulate Kubernetes health probes (liveness, readiness)

import type { Pod, Probe, PodPhase } from './ressources/Pod'

// ADT for probe results
type ProbeResult = { success: true } | { success: false; reason: string }

// ─── Helper Functions ────────────────────────────────────────────────────

const getTimeSinceCreation = (pod: Pod): number => {
    const now = new Date().getTime()
    const created = new Date(pod.metadata.creationTimestamp).getTime()
    return now - created
}

// ─── Core Probe Check ────────────────────────────────────────────────────

/**
 * Simulate probe check based on pod phase and time since start
 * Pure function that doesn't depend on external state
 */
export const simulateProbeCheck = (
    probe: Probe,
    podPhase: PodPhase,
    timeSinceStart: number
): ProbeResult => {
    const initialDelay = probe.initialDelaySeconds ?? 0

    // Check if initial delay has passed
    if (timeSinceStart < initialDelay * 1000) {
        return {
            success: false,
            reason: `Waiting for initial delay (${initialDelay}s)`,
        }
    }

    // Kubernetes behavior: Probes only succeed when pod is Running
    if (podPhase === 'Running') {
        return { success: true }
    }

    // Kubernetes behavior: Failed pods always fail probes
    if (podPhase === 'Failed') {
        return {
            success: false,
            reason: 'Pod has failed',
        }
    }

    // Kubernetes behavior: Pending/Unknown pods are not ready
    return {
        success: false,
        reason: 'Pod is not ready yet',
    }
}

// ─── Liveness Probe ──────────────────────────────────────────────────────

/**
 * Evaluate liveness probe - returns failure if pod should restart
 * Liveness probes determine if container is alive and should be restarted
 */
export const evaluateLivenessProbe = (pod: Pod, probe: Probe): ProbeResult => {
    const timeSinceStart = getTimeSinceCreation(pod)
    return simulateProbeCheck(probe, pod.status.phase, timeSinceStart)
}

// ─── Readiness Probe ─────────────────────────────────────────────────────

/**
 * Evaluate readiness probe - returns failure if pod not ready for traffic
 * Readiness probes determine if container should receive traffic
 */
export const evaluateReadinessProbe = (pod: Pod, probe: Probe): ProbeResult => {
    const timeSinceStart = getTimeSinceCreation(pod)
    return simulateProbeCheck(probe, pod.status.phase, timeSinceStart)
}

