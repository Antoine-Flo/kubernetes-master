import { createDirectory, createFile } from './models'
import type { FileSystemState } from './FileSystem'

// Example Pod manifest (YAML format)
const POD_EXAMPLE_YAML = `apiVersion: v1
kind: Pod
metadata:
  name: nginx
  namespace: default
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80`

// Example Deployment manifest (YML format)
const DEPLOYMENT_EXAMPLE_YML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80`

// Example Service manifest (JSON format)
const SERVICE_EXAMPLE_JSON = `{
  "apiVersion": "v1",
  "kind": "Service",
  "metadata": {
    "name": "nginx-service",
    "namespace": "default"
  },
  "spec": {
    "selector": {
      "app": "nginx"
    },
    "ports": [
      {
        "protocol": "TCP",
        "port": 80,
        "targetPort": 80
      }
    ],
    "type": "ClusterIP"
  }
}`

// Pure function: Create seed filesystem with examples
export const createSeedFileSystem = (): FileSystemState => {
    // Create root directory
    const root = createDirectory('root', '/')

    // Create examples directory
    const examples = createDirectory('examples', '/examples')
    const podExample = createFile('pod-example.yaml', '/examples/pod-example.yaml', POD_EXAMPLE_YAML)
    const deploymentExample = createFile('deployment-example.yml', '/examples/deployment-example.yml', DEPLOYMENT_EXAMPLE_YML)
    const serviceExample = createFile('service-example.json', '/examples/service-example.json', SERVICE_EXAMPLE_JSON)

    examples.children.set('pod-example.yaml', podExample)
    examples.children.set('deployment-example.yml', deploymentExample)
    examples.children.set('service-example.json', serviceExample)

    // Create manifests directory (empty)
    const manifests = createDirectory('manifests', '/manifests')

    // Add directories to root
    root.children.set('examples', examples)
    root.children.set('manifests', manifests)

    return {
        currentPath: '/',
        tree: root
    }
}

