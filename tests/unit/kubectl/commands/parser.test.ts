import { describe, it, expect } from 'vitest'
import { parseCommand } from '../../../../src/kubectl/commands/parser'
import type { ParsedCommand } from '../../../../src/kubectl/commands/types'

describe('kubectl Parser', () => {
  describe('parseCommand', () => {
    describe('basic get commands', () => {
      it('should parse "kubectl get pods"', () => {
        const result = parseCommand('kubectl get pods')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('get')
          expect(result.data.resource).toBe('pods')
          expect(result.data.name).toBeUndefined()
          expect(result.data.namespace).toBeUndefined()
          expect(result.data.flags).toEqual({})
        }
      })

      it('should parse "kubectl get deployments"', () => {
        const result = parseCommand('kubectl get deployments')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('get')
          expect(result.data.resource).toBe('deployments')
        }
      })

      it('should parse "kubectl get services"', () => {
        const result = parseCommand('kubectl get services')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('get')
          expect(result.data.resource).toBe('services')
        }
      })

      it('should parse "kubectl get namespaces"', () => {
        const result = parseCommand('kubectl get namespaces')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('get')
          expect(result.data.resource).toBe('namespaces')
        }
      })
    })

    describe('commands with resource name', () => {
      it('should parse "kubectl describe pod nginx"', () => {
        const result = parseCommand('kubectl describe pod nginx')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('describe')
          expect(result.data.resource).toBe('pods')
          expect(result.data.name).toBe('nginx')
        }
      })

      it('should parse "kubectl delete pod nginx"', () => {
        const result = parseCommand('kubectl delete pod nginx')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('delete')
          expect(result.data.resource).toBe('pods')
          expect(result.data.name).toBe('nginx')
        }
      })

      it('should parse "kubectl get pod nginx"', () => {
        const result = parseCommand('kubectl get pod nginx')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('get')
          expect(result.data.resource).toBe('pods')
          expect(result.data.name).toBe('nginx')
        }
      })
    })

    describe('commands with namespace flag', () => {
      it('should parse "kubectl get pods -n kube-system"', () => {
        const result = parseCommand('kubectl get pods -n kube-system')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('get')
          expect(result.data.resource).toBe('pods')
          expect(result.data.namespace).toBe('kube-system')
        }
      })

      it('should parse "kubectl get pods --namespace kube-system"', () => {
        const result = parseCommand('kubectl get pods --namespace kube-system')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.namespace).toBe('kube-system')
        }
      })

      it('should parse "kubectl describe pod nginx -n default"', () => {
        const result = parseCommand('kubectl describe pod nginx -n default')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('describe')
          expect(result.data.resource).toBe('pods')
          expect(result.data.name).toBe('nginx')
          expect(result.data.namespace).toBe('default')
        }
      })
    })

    describe('commands with multiple flags', () => {
      it('should parse "kubectl get pods -n default -o wide"', () => {
        const result = parseCommand('kubectl get pods -n default -o wide')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.namespace).toBe('default')
          expect(result.data.flags).toHaveProperty('o', 'wide')
        }
      })

      it('should parse "kubectl get pods --namespace default --output json"', () => {
        const result = parseCommand('kubectl get pods --namespace default --output json')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.namespace).toBe('default')
          expect(result.data.flags).toHaveProperty('output', 'json')
        }
      })
    })

    describe('apply and create commands', () => {
      it('should parse "kubectl apply -f pod.yaml"', () => {
        const result = parseCommand('kubectl apply -f pod.yaml')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('apply')
          expect(result.data.flags).toHaveProperty('f', 'pod.yaml')
        }
      })

      it('should parse "kubectl create -f deployment.yaml"', () => {
        const result = parseCommand('kubectl create -f deployment.yaml')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('create')
          expect(result.data.flags).toHaveProperty('f', 'deployment.yaml')
        }
      })

      it('should parse "kubectl apply --filename /path/to/file.yaml"', () => {
        const result = parseCommand('kubectl apply --filename /path/to/file.yaml')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('apply')
          expect(result.data.flags).toHaveProperty('filename', '/path/to/file.yaml')
        }
      })
    })

    describe('edge cases and errors', () => {
      it('should return error for empty input', () => {
        const result = parseCommand('')

        expect(result.type).toBe('error')
        if (result.type === 'error') {
          expect(result.message).toContain('empty')
        }
      })

      it('should return error for whitespace only', () => {
        const result = parseCommand('   ')

        expect(result.type).toBe('error')
        if (result.type === 'error') {
          expect(result.message).toContain('empty')
        }
      })

      it('should return error for non-kubectl command', () => {
        const result = parseCommand('ls -la')

        expect(result.type).toBe('error')
        if (result.type === 'error') {
          expect(result.message).toContain('kubectl')
        }
      })

      it('should return error for kubectl without action', () => {
        const result = parseCommand('kubectl')

        expect(result.type).toBe('error')
        if (result.type === 'error') {
          expect(result.message).toContain('action')
        }
      })

      it('should return error for kubectl with invalid action', () => {
        const result = parseCommand('kubectl invalid pods')

        expect(result.type).toBe('error')
        if (result.type === 'error') {
          expect(result.message).toContain('action')
        }
      })

      it('should return error for kubectl action without resource', () => {
        const result = parseCommand('kubectl get')

        expect(result.type).toBe('error')
        if (result.type === 'error') {
          expect(result.message).toContain('resource')
        }
      })

      it('should return error for kubectl with invalid resource', () => {
        const result = parseCommand('kubectl get invalidresource')

        expect(result.type).toBe('error')
        if (result.type === 'error') {
          expect(result.message).toContain('resource')
        }
      })

      it('should return error for flag without value', () => {
        const result = parseCommand('kubectl get pods -n')

        expect(result.type).toBe('error')
        if (result.type === 'error') {
          expect(result.message).toContain('flag')
        }
      })
    })

    describe('whitespace handling', () => {
      it('should handle extra spaces between tokens', () => {
        const result = parseCommand('kubectl   get    pods')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('get')
          expect(result.data.resource).toBe('pods')
        }
      })

      it('should trim leading and trailing whitespace', () => {
        const result = parseCommand('  kubectl get pods  ')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('get')
          expect(result.data.resource).toBe('pods')
        }
      })
    })

    describe('kubernetes resource aliases', () => {
      it('should parse "kubectl get po" (pods alias)', () => {
        const result = parseCommand('kubectl get po')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('get')
          expect(result.data.resource).toBe('pods')
        }
      })

      it('should parse "kubectl get deploy" (deployments alias)', () => {
        const result = parseCommand('kubectl get deploy')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('get')
          expect(result.data.resource).toBe('deployments')
        }
      })

      it('should parse "kubectl get svc" (services alias)', () => {
        const result = parseCommand('kubectl get svc')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('get')
          expect(result.data.resource).toBe('services')
        }
      })

      it('should parse "kubectl get ns" (namespaces alias)', () => {
        const result = parseCommand('kubectl get ns')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('get')
          expect(result.data.resource).toBe('namespaces')
        }
      })

      it('should parse "kubectl describe po nginx" (pod alias with resource name)', () => {
        const result = parseCommand('kubectl describe po nginx')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('describe')
          expect(result.data.resource).toBe('pods')
          expect(result.data.name).toBe('nginx')
        }
      })

      it('should parse "kubectl delete deploy my-app" (deployment alias with resource name)', () => {
        const result = parseCommand('kubectl delete deploy my-app')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('delete')
          expect(result.data.resource).toBe('deployments')
          expect(result.data.name).toBe('my-app')
        }
      })

      it('should parse "kubectl get po -n kube-system" (alias with namespace flag)', () => {
        const result = parseCommand('kubectl get po -n kube-system')

        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('get')
          expect(result.data.resource).toBe('pods')
          expect(result.data.namespace).toBe('kube-system')
        }
      })

      it('should parse "kubectl get svc my-service -n default" (alias with name and flag)', () => {
        const result = parseCommand('kubectl get svc my-service -n default')
        expect(result.type).toBe('success')
        if (result.type === 'success') {
          expect(result.data.action).toBe('get')
          expect(result.data.resource).toBe('services')
          expect(result.data.name).toBe('my-service')
          expect(result.data.namespace).toBe('default')
        }
      })
    })
  })
})

