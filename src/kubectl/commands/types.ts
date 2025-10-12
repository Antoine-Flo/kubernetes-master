// Action types supported by kubectl parser
export type Action = 'get' | 'describe' | 'delete' | 'apply' | 'create'

// Resource types (canonical names only)
export type Resource = 'pods' | 'deployments' | 'services' | 'namespaces'

// Parsed command structure
export interface ParsedCommand {
  action: Action
  resource: Resource
  name?: string
  namespace?: string
  flags: Record<string, string>
}

// Result type using discriminated unions
export type CommandResult<T> =
  | { type: 'success'; data: T }
  | { type: 'error'; message: string }

