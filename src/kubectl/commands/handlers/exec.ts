import type { ClusterStateData } from '../../../cluster/ClusterState'
import type { EnvVar } from '../../../cluster/ressources/Pod'
import type { ParsedCommand } from '../types'

// ═══════════════════════════════════════════════════════════════════════════
// KUBECTL EXEC HANDLER
// ═══════════════════════════════════════════════════════════════════════════
// Simulates command execution inside a container

/**
 * Format environment variable for display
 */
const formatEnvVar = (envVar: EnvVar): string => {
    const { name, source } = envVar

    if (source.type === 'value') {
        return `${name}=${source.value}`
    }
    if (source.type === 'configMapKeyRef') {
        return `${name}=<from configMap ${source.name}:${source.key}>`
    }
    if (source.type === 'secretKeyRef') {
        return `${name}=<from secret ${source.name}:${source.key}>`
    }
    return `${name}=unknown`
}

/**
 * Simulate environment variables display
 */
const handleEnvCommand = (state: ClusterStateData, podName: string, namespace: string): string => {
    const pod = state.pods.items.find(
        p => p.metadata.name === podName && p.metadata.namespace === namespace
    )

    if (!pod) {
        return ''
    }

    // Get env vars from first container
    const container = pod.spec.containers[0]
    const envVars = container?.env || []

    // Standard env vars that every container has
    const standardEnvVars = [
        'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        'HOME=/root',
        'HOSTNAME=' + podName,
    ]

    // Custom env vars
    const customEnvVars = envVars.map(formatEnvVar)

    return [...standardEnvVars, ...customEnvVars].join('\n')
}



/**
 * Handle kubectl exec command
 * Simulates command execution in a pod container
 */
export const handleExec = (state: ClusterStateData, parsed: ParsedCommand): string => {
    // Validate pod name is provided
    if (!parsed.name) {
        return 'Error: pod name is required'
    }

    // Validate command is provided
    if (!parsed.execCommand || parsed.execCommand.length === 0) {
        return 'Error: command must be specified after --'
    }

    const namespace = parsed.namespace || 'default'
    const podName = parsed.name

    // Find the pod
    const pod = state.pods.items.find(
        p => p.metadata.name === podName && p.metadata.namespace === namespace
    )

    if (!pod) {
        return `Error from server (NotFound): pods "${podName}" not found`
    }

    // Check pod is running
    if (pod.status.phase !== 'Running') {
        return `Error: pod "${podName}" is not running (current phase: ${pod.status.phase})`
    }

    // Get container name (use first container if not specified)
    const containerName = pod.spec.containers[0]?.name || 'default'

    // Execute command
    const command = parsed.execCommand[0]
    const args = parsed.execCommand

    // Shell commands - enter interactive mode
    if (command === 'sh' || command === 'bash' || command === '/bin/sh' || command === '/bin/bash') {
        // This will be handled by the main dispatcher to enter container mode
        return `ENTER_CONTAINER:${podName}:${containerName}:${namespace}`
    }

    // env command - show environment variables
    if (command === 'env') {
        return handleEnvCommand(state, podName, namespace)
    }

    // For all other commands, let the shell executor handle them
    // This will be processed by the main dispatcher
    const fullCommand = args.join(' ')
    return `SHELL_COMMAND:${fullCommand}`
}

