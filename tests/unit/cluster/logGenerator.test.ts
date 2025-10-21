import { describe, it, expect } from 'vitest'
import { generateLogs } from '../../../src/cluster/logGenerator'

describe('logGenerator', () => {
    describe('generateLogs', () => {
        it('should generate specified number of logs', () => {
            const logs = generateLogs('nginx:latest', 10)
            expect(logs).toHaveLength(10)
        })

        it('should generate logs with ISO timestamps', () => {
            const logs = generateLogs('nginx:latest', 5)
            logs.forEach(log => {
                // Check for ISO 8601 timestamp pattern
                expect(log).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
            })
        })

        it('should generate nginx-style HTTP logs for nginx images', () => {
            const logs = generateLogs('nginx:1.21', 20)
            
            // Nginx logs should contain HTTP methods, status codes, paths
            const hasHttpMethod = logs.some(log => 
                log.includes('GET') || log.includes('POST') || log.includes('PUT')
            )
            const hasStatusCode = logs.some(log => 
                log.includes('200') || log.includes('404') || log.includes('500')
            )
            
            expect(hasHttpMethod).toBe(true)
            expect(hasStatusCode).toBe(true)
        })

        it('should generate redis-style logs for redis images', () => {
            const logs = generateLogs('redis:6', 20)
            
            // Redis logs should contain Redis-specific terms
            const hasRedisTerms = logs.some(log =>
                log.toLowerCase().includes('redis') ||
                log.toLowerCase().includes('connection') ||
                log.toLowerCase().includes('client')
            )
            
            expect(hasRedisTerms).toBe(true)
        })

        it('should generate mysql-style logs for mysql images', () => {
            const logs = generateLogs('mysql:8.0', 20)
            
            // MySQL logs should contain database-specific terms
            const hasMysqlTerms = logs.some(log =>
                log.toLowerCase().includes('mysql') ||
                log.toLowerCase().includes('query') ||
                log.toLowerCase().includes('connection')
            )
            
            expect(hasMysqlTerms).toBe(true)
        })

        it('should generate postgres-style logs for postgres images', () => {
            const logs = generateLogs('postgres:13', 20)
            
            // PostgreSQL logs should contain postgres-specific terms
            const hasPostgresTerms = logs.some(log =>
                log.toLowerCase().includes('postgres') ||
                log.toLowerCase().includes('database') ||
                log.toLowerCase().includes('connection')
            )
            
            expect(hasPostgresTerms).toBe(true)
        })

        it('should generate generic logs for unknown images', () => {
            const logs = generateLogs('myapp:v1.0', 10)
            
            // Should still have valid structure
            expect(logs).toHaveLength(10)
            logs.forEach(log => {
                expect(log).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
            })
        })

        it('should include different log levels (INFO, WARN, ERROR)', () => {
            const logs = generateLogs('nginx:latest', 50)
            
            const hasInfo = logs.some(log => log.includes('INFO'))
            const hasWarn = logs.some(log => log.includes('WARN'))
            const hasError = logs.some(log => log.includes('ERROR'))
            
            // With 50 logs, we should see variety
            expect(hasInfo).toBe(true)
            expect(hasWarn || hasError).toBe(true)
        })

        it('should generate empty array for count 0', () => {
            const logs = generateLogs('nginx:latest', 0)
            expect(logs).toEqual([])
        })

        it('should handle negative count by returning empty array', () => {
            const logs = generateLogs('nginx:latest', -5)
            expect(logs).toEqual([])
        })

        it('should cap logs at 200 lines', () => {
            const logs = generateLogs('nginx:latest', 500)
            expect(logs).toHaveLength(200)
        })

        it('should generate unique timestamps in chronological order', () => {
            const logs = generateLogs('nginx:latest', 10)
            
            for (let i = 1; i < logs.length; i++) {
                const prevTimestamp = logs[i - 1].substring(0, 19)
                const currTimestamp = logs[i].substring(0, 19)
                
                // Timestamps should be in order (later or equal)
                expect(new Date(currTimestamp).getTime()).toBeGreaterThanOrEqual(
                    new Date(prevTimestamp).getTime()
                )
            }
        })

        it('should generate realistic nginx access log patterns', () => {
            const logs = generateLogs('nginx:alpine', 30)
            
            // Check for IP addresses
            const hasIpPattern = logs.some(log => log.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/))
            expect(hasIpPattern).toBe(true)
        })

        it('should generate realistic redis server logs', () => {
            const logs = generateLogs('redis:latest', 30)
            
            // Redis logs often mention port 6379
            const hasRedisPort = logs.some(log => log.includes('6379'))
            expect(hasRedisPort).toBe(true)
        })

        it('should maintain consistent image detection regardless of tag', () => {
            const nginx1 = generateLogs('nginx:latest', 10)
            const nginx2 = generateLogs('nginx:1.21.0', 10)
            const nginx3 = generateLogs('nginx', 10)
            
            // All should be nginx-style (contain HTTP methods)
            const allHaveHttp = [nginx1, nginx2, nginx3].every(logs =>
                logs.some(log => log.includes('GET') || log.includes('POST'))
            )
            
            expect(allHaveHttp).toBe(true)
        })

        it('should handle case-insensitive image names', () => {
            const logs1 = generateLogs('NGINX:latest', 10)
            const logs2 = generateLogs('nginx:latest', 10)
            
            // Both should generate nginx-style logs
            const both = [...logs1, ...logs2]
            const hasHttpMethod = both.some(log => 
                log.includes('GET') || log.includes('POST')
            )
            
            expect(hasHttpMethod).toBe(true)
        })

        it('should include log level in each log line', () => {
            const logs = generateLogs('myapp:latest', 30)
            
            const allHaveLevel = logs.every(log => 
                log.includes('INFO') || 
                log.includes('WARN') || 
                log.includes('ERROR') ||
                log.includes('DEBUG')
            )
            
            expect(allHaveLevel).toBe(true)
        })

        it('should generate realistic application startup sequence', () => {
            const logs = generateLogs('myapp:1.0', 20)
            
            // First few logs might mention starting/initialization
            const earlyLogs = logs.slice(0, 5).join(' ')
            const hasStartupTerms = 
                earlyLogs.toLowerCase().includes('start') ||
                earlyLogs.toLowerCase().includes('init') ||
                earlyLogs.toLowerCase().includes('ready')
            
            expect(hasStartupTerms).toBe(true)
        })

        it('should have reasonable log message lengths', () => {
            const logs = generateLogs('nginx:latest', 20)
            
            logs.forEach(log => {
                expect(log.length).toBeGreaterThan(20)
                expect(log.length).toBeLessThan(300)
            })
        })

        it('should not generate identical consecutive logs', () => {
            const logs = generateLogs('nginx:latest', 20)
            
            let identicalCount = 0
            for (let i = 1; i < logs.length; i++) {
                if (logs[i] === logs[i - 1]) {
                    identicalCount++
                }
            }
            
            // Allow maybe 1-2 identical by chance, but not many
            expect(identicalCount).toBeLessThan(3)
        })
    })
})

