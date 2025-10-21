// Action types supported by kubectl parser
export type Action = 'get' | 'describe' | 'delete' | 'apply' | 'create' | 'logs' | 'exec' | 'label' | 'annotate'

// Resource types (canonical names only)
export type Resource = 'pods' | 'deployments' | 'services' | 'namespaces' | 'configmaps' | 'secrets'

// Parsed command structure
export interface ParsedCommand {
  action: Action
  resource: Resource
  name?: string
  namespace?: string
  output?: 'table' | 'yaml' | 'json'
  selector?: Record<string, string> // Parsed label selector (e.g., -l app=nginx,env=prod)
  flags: Record<string, string | boolean> // Raw flags for backward compatibility
  execCommand?: string[] // For kubectl exec: command after --
  labelChanges?: Record<string, string | null> // For kubectl label: key=value or key- (null = removal)
  annotationChanges?: Record<string, string | null> // For kubectl annotate: key=value or key- (null = removal)
}

