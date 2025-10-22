// ═══════════════════════════════════════════════════════════════════════════
// YAML PARSER & VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════
// Parse and validate YAML manifests for Kubernetes resources.
// Uses Zod schemas defined in resource models for validation.

import { parse } from 'yaml'
import type { ConfigMap } from '../cluster/ressources/ConfigMap'
import { parseConfigMapManifest } from '../cluster/ressources/ConfigMap'
import type { Pod } from '../cluster/ressources/Pod'
import { parsePodManifest } from '../cluster/ressources/Pod'
import type { Secret } from '../cluster/ressources/Secret'
import { parseSecretManifest } from '../cluster/ressources/Secret'
import type { Result } from '../shared/result'
import { error, success } from '../shared/result'

// ─── Types ───────────────────────────────────────────────────────────────

type ParsedResource = Pod | ConfigMap | Secret

type ResourceKind = 'Pod' | 'ConfigMap' | 'Secret'

// ─── YAML Parsing ────────────────────────────────────────────────────────

/**
 * Parse YAML string with error handling
 */
const parseYaml = (yamlContent: string): Result<unknown> => {
    try {
        const parsed = parse(yamlContent)
        if (!parsed || typeof parsed !== 'object') {
            return error('YAML content is empty or invalid')
        }
        return success(parsed)
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown YAML parse error'
        return error(`YAML parse error: ${message}`)
    }
}

/**
 * Check if kind is supported
 */
const isSupportedKind = (kind: string): kind is ResourceKind => {
    return kind === 'Pod' || kind === 'ConfigMap' || kind === 'Secret'
}

/**
 * Manifest parser lookup table (object lookup pattern)
 */
const MANIFEST_PARSERS: Record<ResourceKind, (obj: any) => Result<ParsedResource>> = {
    Pod: parsePodManifest,
    ConfigMap: parseConfigMapManifest,
    Secret: parseSecretManifest
}

/**
 * Route validation to resource-specific parser
 */
const validateResource = (obj: any): Result<ParsedResource> => {
    // Basic structure validation
    if (!obj.kind || typeof obj.kind !== 'string') {
        return error('Missing or invalid kind')
    }

    if (!isSupportedKind(obj.kind)) {
        return error(`Unsupported resource kind: ${obj.kind} (supported: Pod, ConfigMap, Secret)`)
    }

    const parser = MANIFEST_PARSERS[obj.kind as ResourceKind]
    return parser(obj)
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Parse and validate YAML manifest
 * 
 * @param yamlContent - YAML string to parse
 * @returns Result with validated resource or error message
 */
export const parseKubernetesYaml = (yamlContent: string): Result<ParsedResource> => {
    const parseResult = parseYaml(yamlContent)
    if (!parseResult.ok) {
        return parseResult
    }

    return validateResource(parseResult.value)
}
