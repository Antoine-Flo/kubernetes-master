import { describe, it, expect } from 'vitest'
import { parseCommand } from '../../../../src/kubectl/commands/parser'

describe('kubectl Parser', () => {
  describe('parseCommand', () => {
    describe('basic get commands', () => {
      it('should parse "kubectl get pods"', () => {
        const result = parseCommand('kubectl get pods')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('get')
          expect(result.value.resource).toBe('pods')
          expect(result.value.name).toBeUndefined()
          expect(result.value.namespace).toBeUndefined()
          expect(result.value.flags).toEqual({})
        }
      })

      it('should parse "kubectl get deployments"', () => {
        const result = parseCommand('kubectl get deployments')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('get')
          expect(result.value.resource).toBe('deployments')
        }
      })

      it('should parse "kubectl get services"', () => {
        const result = parseCommand('kubectl get services')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('get')
          expect(result.value.resource).toBe('services')
        }
      })

      it('should parse "kubectl get namespaces"', () => {
        const result = parseCommand('kubectl get namespaces')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('get')
          expect(result.value.resource).toBe('namespaces')
        }
      })
    })

    describe('commands with resource name', () => {
      it('should parse "kubectl describe pod nginx"', () => {
        const result = parseCommand('kubectl describe pod nginx')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('describe')
          expect(result.value.resource).toBe('pods')
          expect(result.value.name).toBe('nginx')
        }
      })

      it('should parse "kubectl delete pod nginx"', () => {
        const result = parseCommand('kubectl delete pod nginx')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('delete')
          expect(result.value.resource).toBe('pods')
          expect(result.value.name).toBe('nginx')
        }
      })

      it('should parse "kubectl get pod nginx"', () => {
        const result = parseCommand('kubectl get pod nginx')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('get')
          expect(result.value.resource).toBe('pods')
          expect(result.value.name).toBe('nginx')
        }
      })
    })

    describe('commands with namespace flag', () => {
      it('should parse "kubectl get pods -n kube-system"', () => {
        const result = parseCommand('kubectl get pods -n kube-system')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('get')
          expect(result.value.resource).toBe('pods')
          expect(result.value.namespace).toBe('kube-system')
        }
      })

      it('should parse "kubectl get pods --namespace kube-system"', () => {
        const result = parseCommand('kubectl get pods --namespace kube-system')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.namespace).toBe('kube-system')
        }
      })

      it('should parse "kubectl describe pod nginx -n default"', () => {
        const result = parseCommand('kubectl describe pod nginx -n default')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('describe')
          expect(result.value.resource).toBe('pods')
          expect(result.value.name).toBe('nginx')
          expect(result.value.namespace).toBe('default')
        }
      })
    })

    describe('commands with multiple flags', () => {
      it('should parse "kubectl get pods -n default -o wide"', () => {
        const result = parseCommand('kubectl get pods -n default -o wide')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.namespace).toBe('default')
          expect(result.value.flags).toHaveProperty('o', 'wide')
        }
      })

      it('should parse "kubectl get pods --namespace default --output json"', () => {
        const result = parseCommand('kubectl get pods --namespace default --output json')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.namespace).toBe('default')
          expect(result.value.flags).toHaveProperty('output', 'json')
        }
      })
    })

    describe('apply and create commands', () => {
      it('should parse "kubectl apply -f pod.yaml"', () => {
        const result = parseCommand('kubectl apply -f pod.yaml')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('apply')
          expect(result.value.flags).toHaveProperty('f', 'pod.yaml')
        }
      })

      it('should parse "kubectl create -f deployment.yaml"', () => {
        const result = parseCommand('kubectl create -f deployment.yaml')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('create')
          expect(result.value.flags).toHaveProperty('f', 'deployment.yaml')
        }
      })

      it('should parse "kubectl apply --filename /path/to/file.yaml"', () => {
        const result = parseCommand('kubectl apply --filename /path/to/file.yaml')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('apply')
          expect(result.value.flags).toHaveProperty('filename', '/path/to/file.yaml')
        }
      })
    })

    describe('edge cases and errors', () => {
      it('should return error for empty input', () => {
        const result = parseCommand('')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toContain('empty')
        }
      })

      it('should return error for whitespace only', () => {
        const result = parseCommand('   ')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toContain('empty')
        }
      })

      it('should return error for non-kubectl command', () => {
        const result = parseCommand('ls -la')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toContain('kubectl')
        }
      })

      it('should return error for kubectl without action', () => {
        const result = parseCommand('kubectl')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toContain('action')
        }
      })

      it('should return error for kubectl with invalid action', () => {
        const result = parseCommand('kubectl invalid pods')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toContain('action')
        }
      })

      it('should return error for kubectl action without resource', () => {
        const result = parseCommand('kubectl get')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toContain('resource')
        }
      })

      it('should return error for kubectl with invalid resource', () => {
        const result = parseCommand('kubectl get invalidresource')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toContain('resource')
        }
      })

      it('should return error for flag without value', () => {
        const result = parseCommand('kubectl get pods -n')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toContain('flag')
        }
      })
    })

    describe('whitespace handling', () => {
      it('should handle extra spaces between tokens', () => {
        const result = parseCommand('kubectl   get    pods')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('get')
          expect(result.value.resource).toBe('pods')
        }
      })

      it('should trim leading and trailing whitespace', () => {
        const result = parseCommand('  kubectl get pods  ')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('get')
          expect(result.value.resource).toBe('pods')
        }
      })
    })

    describe('kubernetes resource aliases', () => {
      it('should parse "kubectl get po" (pods alias)', () => {
        const result = parseCommand('kubectl get po')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('get')
          expect(result.value.resource).toBe('pods')
        }
      })

      it('should parse "kubectl get deploy" (deployments alias)', () => {
        const result = parseCommand('kubectl get deploy')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('get')
          expect(result.value.resource).toBe('deployments')
        }
      })

      it('should parse "kubectl get svc" (services alias)', () => {
        const result = parseCommand('kubectl get svc')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('get')
          expect(result.value.resource).toBe('services')
        }
      })

      it('should parse "kubectl get ns" (namespaces alias)', () => {
        const result = parseCommand('kubectl get ns')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('get')
          expect(result.value.resource).toBe('namespaces')
        }
      })

      it('should parse "kubectl describe po nginx" (pod alias with resource name)', () => {
        const result = parseCommand('kubectl describe po nginx')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('describe')
          expect(result.value.resource).toBe('pods')
          expect(result.value.name).toBe('nginx')
        }
      })

      it('should parse "kubectl delete deploy my-app" (deployment alias with resource name)', () => {
        const result = parseCommand('kubectl delete deploy my-app')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('delete')
          expect(result.value.resource).toBe('deployments')
          expect(result.value.name).toBe('my-app')
        }
      })

      it('should parse "kubectl get po -n kube-system" (alias with namespace flag)', () => {
        const result = parseCommand('kubectl get po -n kube-system')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('get')
          expect(result.value.resource).toBe('pods')
          expect(result.value.namespace).toBe('kube-system')
        }
      })

      it('should parse "kubectl get svc my-service -n default" (alias with name and flag)', () => {
        const result = parseCommand('kubectl get svc my-service -n default')
        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('get')
          expect(result.value.resource).toBe('services')
          expect(result.value.name).toBe('my-service')
          expect(result.value.namespace).toBe('default')
        }
      })
    })

    describe('kubectl logs commands', () => {
      it('should parse "kubectl logs nginx"', () => {
        const result = parseCommand('kubectl logs nginx')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('logs')
          expect(result.value.resource).toBe('pods')
          expect(result.value.name).toBe('nginx')
          expect(result.value.namespace).toBeUndefined()
        }
      })

      it('should parse "kubectl logs nginx -n production"', () => {
        const result = parseCommand('kubectl logs nginx -n production')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('logs')
          expect(result.value.resource).toBe('pods')
          expect(result.value.name).toBe('nginx')
          expect(result.value.namespace).toBe('production')
        }
      })

      it('should parse "kubectl logs nginx --tail 20"', () => {
        const result = parseCommand('kubectl logs nginx --tail 20')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('logs')
          expect(result.value.name).toBe('nginx')
          expect(result.value.flags.tail).toBe('20')
        }
      })

      it('should parse "kubectl logs nginx -f"', () => {
        const result = parseCommand('kubectl logs nginx -f')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('logs')
          expect(result.value.name).toBe('nginx')
          expect(result.value.flags.f).toBe(true)
        }
      })

      it('should parse "kubectl logs nginx --follow"', () => {
        const result = parseCommand('kubectl logs nginx --follow')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('logs')
          expect(result.value.name).toBe('nginx')
          expect(result.value.flags.follow).toBe(true)
        }
      })

      it('should parse "kubectl logs nginx --tail 10 -f"', () => {
        const result = parseCommand('kubectl logs nginx --tail 10 -f')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('logs')
          expect(result.value.name).toBe('nginx')
          expect(result.value.flags.tail).toBe('10')
          expect(result.value.flags.f).toBe(true)
        }
      })

      it('should return error for "kubectl logs" without pod name', () => {
        const result = parseCommand('kubectl logs')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('logs requires a resource name')
        }
      })
    })

    describe('kubectl exec commands', () => {
      it('should parse "kubectl exec nginx -- ls"', () => {
        const result = parseCommand('kubectl exec nginx -- ls')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('exec')
          expect(result.value.resource).toBe('pods')
          expect(result.value.name).toBe('nginx')
          expect(result.value.execCommand).toEqual(['ls'])
        }
      })

      it('should parse "kubectl exec nginx -it -- sh"', () => {
        const result = parseCommand('kubectl exec nginx -it -- sh')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('exec')
          expect(result.value.resource).toBe('pods')
          expect(result.value.name).toBe('nginx')
          expect(result.value.flags.it).toBe(true)
          expect(result.value.execCommand).toEqual(['sh'])
        }
      })

      it('should parse "kubectl exec -it nginx -- bash"', () => {
        const result = parseCommand('kubectl exec -it nginx -- bash')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('exec')
          expect(result.value.name).toBe('nginx')
          expect(result.value.execCommand).toEqual(['bash'])
        }
      })

      it('should parse "kubectl exec nginx -n production -- env"', () => {
        const result = parseCommand('kubectl exec nginx -n production -- env')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('exec')
          expect(result.value.name).toBe('nginx')
          expect(result.value.namespace).toBe('production')
          expect(result.value.execCommand).toEqual(['env'])
        }
      })

      it('should parse command with multiple arguments', () => {
        const result = parseCommand('kubectl exec nginx -- ls -la /app')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('exec')
          expect(result.value.name).toBe('nginx')
          expect(result.value.execCommand).toEqual(['ls', '-la', '/app'])
        }
      })

      it('should parse "kubectl exec nginx -- echo Hello World"', () => {
        const result = parseCommand('kubectl exec nginx -- echo Hello World')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.execCommand).toEqual(['echo', 'Hello', 'World'])
        }
      })

      it('should handle exec without -- separator', () => {
        const result = parseCommand('kubectl exec nginx sh')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('exec')
          expect(result.value.name).toBe('nginx')
          expect(result.value.execCommand).toBeUndefined()
        }
      })

      it('should return error for "kubectl exec" without pod name', () => {
        const result = parseCommand('kubectl exec')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('exec requires a resource name')
        }
      })

      it('should handle flags before -- separator', () => {
        const result = parseCommand('kubectl exec -it -n kube-system nginx -- sh')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.namespace).toBe('kube-system')
          expect(result.value.flags.it).toBe(true)
          expect(result.value.execCommand).toEqual(['sh'])
        }
      })
    })

    describe('label commands', () => {
      it('should parse "kubectl label pods nginx app=web"', () => {
        const result = parseCommand('kubectl label pods nginx app=web')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('label')
          expect(result.value.resource).toBe('pods')
          expect(result.value.name).toBe('nginx')
          expect(result.value.labelChanges).toEqual({ app: 'web' })
        }
      })

      it('should parse label with multiple key=value pairs', () => {
        const result = parseCommand('kubectl label pods nginx app=web tier=frontend')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.labelChanges).toEqual({
            app: 'web',
            tier: 'frontend',
          })
        }
      })

      it('should parse label removal with key- syntax', () => {
        const result = parseCommand('kubectl label pods nginx app-')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.labelChanges).toEqual({ app: null })
        }
      })

      it('should parse multiple label removals', () => {
        const result = parseCommand('kubectl label pods nginx app- tier-')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.labelChanges).toEqual({
            app: null,
            tier: null,
          })
        }
      })

      it('should parse mixed addition and removal', () => {
        const result = parseCommand('kubectl label pods nginx app=new tier-')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.labelChanges).toEqual({
            app: 'new',
            tier: null,
          })
        }
      })

      it('should parse label with --overwrite flag', () => {
        const result = parseCommand('kubectl label pods nginx app=updated --overwrite')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.flags.overwrite).toBe(true)
          expect(result.value.labelChanges).toEqual({ app: 'updated' })
        }
      })

      it('should parse label with namespace flag', () => {
        const result = parseCommand('kubectl label pods nginx app=web -n kube-system')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.namespace).toBe('kube-system')
          expect(result.value.labelChanges).toEqual({ app: 'web' })
        }
      })

      it('should parse label for configmaps', () => {
        const result = parseCommand('kubectl label configmaps my-config version=1.0')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.resource).toBe('configmaps')
          expect(result.value.name).toBe('my-config')
          expect(result.value.labelChanges).toEqual({ version: '1.0' })
        }
      })

      it('should parse label for secrets', () => {
        const result = parseCommand('kubectl label secrets db-secret app=database')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.resource).toBe('secrets')
          expect(result.value.name).toBe('db-secret')
          expect(result.value.labelChanges).toEqual({ app: 'database' })
        }
      })

      it('should return error when name is missing', () => {
        const result = parseCommand('kubectl label pods')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toContain('requires a resource name')
        }
      })

      it('should parse label with resource alias', () => {
        const result = parseCommand('kubectl label po nginx app=web')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.resource).toBe('pods')
          expect(result.value.name).toBe('nginx')
        }
      })
    })

    describe('annotate commands', () => {
      it('should parse "kubectl annotate pods nginx description=test"', () => {
        const result = parseCommand('kubectl annotate pods nginx description=test')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.action).toBe('annotate')
          expect(result.value.resource).toBe('pods')
          expect(result.value.name).toBe('nginx')
          expect(result.value.annotationChanges).toEqual({ description: 'test' })
        }
      })

      it('should parse annotate with multiple key=value pairs', () => {
        const result = parseCommand('kubectl annotate pods nginx description=test owner=team')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.annotationChanges).toEqual({
            description: 'test',
            owner: 'team',
          })
        }
      })

      it('should parse annotation removal with key- syntax', () => {
        const result = parseCommand('kubectl annotate pods nginx description-')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.annotationChanges).toEqual({ description: null })
        }
      })

      it('should parse annotate with --overwrite flag', () => {
        const result = parseCommand('kubectl annotate pods nginx description=updated --overwrite')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.flags.overwrite).toBe(true)
          expect(result.value.annotationChanges).toEqual({ description: 'updated' })
        }
      })

      it('should parse annotate with namespace flag', () => {
        const result = parseCommand('kubectl annotate pods nginx owner=team -n kube-system')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.namespace).toBe('kube-system')
          expect(result.value.annotationChanges).toEqual({ owner: 'team' })
        }
      })

      it('should parse annotate for configmaps', () => {
        const result = parseCommand('kubectl annotate configmaps my-config description=config')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.resource).toBe('configmaps')
          expect(result.value.name).toBe('my-config')
          expect(result.value.annotationChanges).toEqual({ description: 'config' })
        }
      })

      it('should parse annotate for secrets', () => {
        const result = parseCommand('kubectl annotate secrets db-secret owner=admin')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.resource).toBe('secrets')
          expect(result.value.name).toBe('db-secret')
          expect(result.value.annotationChanges).toEqual({ owner: 'admin' })
        }
      })

      it('should return error when name is missing', () => {
        const result = parseCommand('kubectl annotate pods')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toContain('requires a resource name')
        }
      })

      it('should parse annotation with URL value', () => {
        const result = parseCommand('kubectl annotate pods nginx docs=https://example.com')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.annotationChanges).toEqual({
            docs: 'https://example.com',
          })
        }
      })

      it('should parse annotation with equals sign in value', () => {
        const result = parseCommand('kubectl annotate pods nginx config=key=value')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.value.annotationChanges).toEqual({ config: 'key=value' })
        }
      })
    })
  })
})

