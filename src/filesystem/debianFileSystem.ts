import type { FileSystemState } from './FileSystem'
import { createDirectory, createFile } from './models'

// ═══════════════════════════════════════════════════════════════════════════
// DEBIAN FILESYSTEM TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════
// Template factory that creates a new Debian-like filesystem instance.
// Each call returns a completely isolated and autonomous filesystem.
// Used for both host and container filesystems.

type FileSystemConfig = {
    [path: string]: string | FileSystemConfig
}

/**
 * Create filesystem tree from configuration object
 */
const createFileSystemFromConfig = (config: FileSystemConfig, basePath: string = ''): Map<string, any> => {
    const children = new Map()
    
    for (const [name, content] of Object.entries(config)) {
        const fullPath = basePath === '' ? `/${name}` : `${basePath}/${name}`
        
        if (typeof content === 'string') {
            // It's a file
            children.set(name, createFile(name, fullPath, content))
        } else {
            // It's a directory
            const dir = createDirectory(name, fullPath)
            const subChildren = createFileSystemFromConfig(content, fullPath)
            subChildren.forEach((value, key) => {
                dir.children.set(key, value)
            })
            children.set(name, dir)
        }
    }
    
    return children
}

/**
 * Debian filesystem configuration
 */
const DEBIAN_FILESYSTEM_CONFIG: FileSystemConfig = {
    bin: {
        sh: '#!/bin/sh\n# Simulated shell binary',
        bash: '#!/bin/bash\n# Simulated bash binary',
        ls: '#!/bin/sh\n# Simulated ls binary',
        cat: '#!/bin/sh\n# Simulated cat binary',
        grep: '#!/bin/sh\n# Simulated grep binary',
        ps: '#!/bin/sh\n# Simulated ps binary',
        env: '#!/bin/sh\n# Simulated env binary'
    },
    etc: {
        hostname: 'container-hostname',
        hosts: '127.0.0.1\tlocalhost\n::1\t\tlocalhost ip6-localhost ip6-loopback',
        passwd: 'root:x:0:0:root:/root:/bin/bash',
        'resolv.conf': 'nameserver 8.8.8.8\nnameserver 8.8.4.4'
    },
    home: {},
    root: {},
    tmp: {},
    var: {
        log: {},
        run: {}
    },
    usr: {
        bin: {},
        local: {},
        lib: {}
    }
}

/**
 * Create a new Debian-like filesystem instance
 * Each call returns a completely isolated filesystem
 */
export const debianFileSystem = (): FileSystemState => {
    const root = createDirectory('root', '/')
    const children = createFileSystemFromConfig(DEBIAN_FILESYSTEM_CONFIG)
    
    children.forEach((value, key) => {
        root.children.set(key, value)
    })

    return {
        currentPath: '/',
        tree: root
    }
}

/**
 * Host filesystem configuration with kube user and examples
 */
const HOST_FILESYSTEM_CONFIG: FileSystemConfig = {
    ...DEBIAN_FILESYSTEM_CONFIG,
    etc: {
        hostname: 'container-hostname',
        hosts: '127.0.0.1\tlocalhost\n::1\t\tlocalhost ip6-localhost ip6-loopback',
        passwd: 'root:x:0:0:root:/root:/bin/bash\nkube:x:1000:1000:kube:/home/kube:/bin/bash',
        'resolv.conf': 'nameserver 8.8.8.8\nnameserver 8.8.4.4'
    },
    home: {
        kube: {
            examples: {
                'pod-example.yaml': `apiVersion: v1
kind: Pod
metadata:
  name: nginx
  namespace: default
spec:
  containers:
  - name: nginx
    image: nginx:latest
    ports:
    - containerPort: 80`,
                'deployment-example.yml': `apiVersion: apps/v1
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
        - containerPort: 80`,
                'service-example.json': `{
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
            }
        }
    }
}

/**
 * Create host filesystem with kube user and examples
 * Used only for the main host filesystem
 */
export const createHostFileSystem = (): FileSystemState => {
    const root = createDirectory('root', '/')
    const children = createFileSystemFromConfig(HOST_FILESYSTEM_CONFIG)
    
    children.forEach((value, key) => {
        root.children.set(key, value)
    })

    return {
        currentPath: '/home/kube',
        tree: root
    }
}

