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
 * Simulate ls command
 */
const handleLsCommand = (args: string[]): string => {
    const path = args.length > 1 ? args[1] : '/'

    if (path === '/') {
        return 'bin  etc  lib  tmp  usr  var  app'
    }

    return `Contents of ${path}:\nindex.js  package.json  node_modules`
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

    // Execute command
    const command = parsed.execCommand[0]
    const args = parsed.execCommand

    // Shell commands - return message about interactive mode
    if (command === 'sh' || command === 'bash' || command === '/bin/sh' || command === '/bin/bash') {
        return `Interactive shell simulation for pod "${podName}"\nShell: ${command}\n\nNote: In a real cluster, you would now have an interactive ${command} session.`
    }

    // env command - show environment variables
    if (command === 'env') {
        return handleEnvCommand(state, podName, namespace)
    }

    // ls command - simulate directory listing
    if (command === 'ls') {
        return handleLsCommand(args)
    }

    // pwd command - show current directory
    if (command === 'pwd') {
        return '/app'
    }

    // whoami command - show user
    if (command === 'whoami') {
        return 'root'
    }

    // Generic command - simulate execution
    const fullCommand = args.join(' ')
    return `Simulated output for: ${fullCommand}\n\nNote: This is a simulation. In a real cluster, this command would execute inside the container.`
}

