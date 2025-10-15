// Action types supported by kubectl parser
export type Action = 'get' | 'describe' | 'delete' | 'apply' | 'create'

// Resource types (canonical names only)
export type Resource = 'pods' | 'deployments' | 'services' | 'namespaces'

// Output formats
export type OutputFormat = 'table' | 'yaml' | 'json'

// Parsed command structure
export interface ParsedCommand {
  action: Action
  resource: Resource
  name?: string
  namespace?: string
  output?: OutputFormat
  selector?: Record<string, string> // Parsed label selector (e.g., -l app=nginx,env=prod)
  flags: Record<string, string | boolean> // Raw flags for backward compatibility
}

