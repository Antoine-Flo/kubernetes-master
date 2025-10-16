import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createLogger, type Logger } from '../../../src/logger/Logger'
import type { LogEntry } from '../../../src/logger/types'

describe('Logger', () => {
    let logger: Logger

    beforeEach(() => {
        logger = createLogger()
    })

    describe('log entry creation', () => {
        it('should create info log entry', () => {
            logger.info('COMMAND', 'Test info message')

            const entries = logger.getEntries()
            expect(entries).toHaveLength(1)
            expect(entries[0].level).toBe('info')
            expect(entries[0].category).toBe('COMMAND')
            expect(entries[0].message).toBe('Test info message')
            expect(entries[0].timestamp).toBeDefined()
        })

        it('should create warn log entry', () => {
            logger.warn('EXECUTOR', 'Test warning')

            const entries = logger.getEntries()
            expect(entries).toHaveLength(1)
            expect(entries[0].level).toBe('warn')
            expect(entries[0].category).toBe('EXECUTOR')
        })

        it('should create error log entry', () => {
            logger.error('FILESYSTEM', 'Test error')

            const entries = logger.getEntries()
            expect(entries).toHaveLength(1)
            expect(entries[0].level).toBe('error')
            expect(entries[0].category).toBe('FILESYSTEM')
        })

        it('should create debug log entry', () => {
            logger.debug('CLUSTER', 'Test debug')

            const entries = logger.getEntries()
            expect(entries).toHaveLength(1)
            expect(entries[0].level).toBe('debug')
            expect(entries[0].category).toBe('CLUSTER')
        })

        it('should create multiple entries in order', () => {
            logger.info('COMMAND', 'First')
            logger.warn('EXECUTOR', 'Second')
            logger.error('FILESYSTEM', 'Third')

            const entries = logger.getEntries()
            expect(entries).toHaveLength(3)
            expect(entries[0].message).toBe('First')
            expect(entries[1].message).toBe('Second')
            expect(entries[2].message).toBe('Third')
        })
    })

    describe('filtering', () => {
        beforeEach(() => {
            logger.info('COMMAND', 'Info message')
            logger.warn('EXECUTOR', 'Warn message')
            logger.error('FILESYSTEM', 'Error message')
            logger.debug('CLUSTER', 'Debug message')
        })

        it('should filter by level', () => {
            const errors = logger.getEntries({ level: 'error' })
            expect(errors).toHaveLength(1)
            expect(errors[0].level).toBe('error')
        })

        it('should filter by category', () => {
            const commandLogs = logger.getEntries({ category: 'COMMAND' })
            expect(commandLogs).toHaveLength(1)
            expect(commandLogs[0].category).toBe('COMMAND')
        })

        it('should filter by level and category', () => {
            logger.error('COMMAND', 'Command error')

            const commandErrors = logger.getEntries({ level: 'error', category: 'COMMAND' })
            expect(commandErrors).toHaveLength(1)
            expect(commandErrors[0].message).toBe('Command error')
        })

        it('should return empty array when no matches', () => {
            const filtered = logger.getEntries({ level: 'info', category: 'CLUSTER' })
            expect(filtered).toHaveLength(0)
        })
    })

    describe('FIFO rotation', () => {
        it('should rotate entries when exceeding max (default 500)', () => {
            const logger = createLogger({ maxEntries: 3 })

            logger.info('COMMAND', 'Entry 1')
            logger.info('COMMAND', 'Entry 2')
            logger.info('COMMAND', 'Entry 3')
            logger.info('COMMAND', 'Entry 4')

            const entries = logger.getEntries()
            expect(entries).toHaveLength(3)
            expect(entries[0].message).toBe('Entry 2')
            expect(entries[1].message).toBe('Entry 3')
            expect(entries[2].message).toBe('Entry 4')
        })

        it('should handle rotation with multiple entries', () => {
            const logger = createLogger({ maxEntries: 5 })

            for (let i = 1; i <= 10; i++) {
                logger.info('COMMAND', `Entry ${i}`)
            }

            const entries = logger.getEntries()
            expect(entries).toHaveLength(5)
            expect(entries[0].message).toBe('Entry 6')
            expect(entries[4].message).toBe('Entry 10')
        })
    })

    describe('clear', () => {
        it('should clear all entries', () => {
            logger.info('COMMAND', 'Test 1')
            logger.warn('EXECUTOR', 'Test 2')
            logger.error('FILESYSTEM', 'Test 3')

            expect(logger.getEntries()).toHaveLength(3)

            logger.clear()

            expect(logger.getEntries()).toHaveLength(0)
        })
    })

    describe('Observer Pattern', () => {
        it('should notify observer on new entry', () => {
            const observed: LogEntry[] = []
            logger.subscribe(entry => observed.push(entry))

            logger.info('COMMAND', 'Test message')

            expect(observed).toHaveLength(1)
            expect(observed[0].message).toBe('Test message')
        })

        it('should notify multiple observers', () => {
            const observed1: LogEntry[] = []
            const observed2: LogEntry[] = []

            logger.subscribe(entry => observed1.push(entry))
            logger.subscribe(entry => observed2.push(entry))

            logger.info('COMMAND', 'Test message')

            expect(observed1).toHaveLength(1)
            expect(observed2).toHaveLength(1)
        })

        it('should support unsubscribe', () => {
            const observed: LogEntry[] = []
            const unsubscribe = logger.subscribe(entry => observed.push(entry))

            logger.info('COMMAND', 'Message 1')
            expect(observed).toHaveLength(1)

            unsubscribe()

            logger.info('COMMAND', 'Message 2')
            expect(observed).toHaveLength(1) // Still 1, not notified after unsubscribe
        })

        it('should handle multiple subscriptions and unsubscriptions', () => {
            const observed1: LogEntry[] = []
            const observed2: LogEntry[] = []

            const unsubscribe1 = logger.subscribe(entry => observed1.push(entry))
            const unsubscribe2 = logger.subscribe(entry => observed2.push(entry))

            logger.info('COMMAND', 'Message 1')
            expect(observed1).toHaveLength(1)
            expect(observed2).toHaveLength(1)

            unsubscribe1()

            logger.info('COMMAND', 'Message 2')
            expect(observed1).toHaveLength(1) // Not updated
            expect(observed2).toHaveLength(2) // Updated

            unsubscribe2()

            logger.info('COMMAND', 'Message 3')
            expect(observed1).toHaveLength(1)
            expect(observed2).toHaveLength(2)
        })
    })

    describe('console mirroring', () => {
        it('should mirror logs to console when enabled', () => {
            const consoleSpy = vi.spyOn(console, 'log')
            const logger = createLogger({ mirrorToConsole: true })

            logger.info('COMMAND', 'Test message')

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[INFO] [COMMAND] Test message')
            )

            consoleSpy.mockRestore()
        })

        it('should use console.error for error level', () => {
            const consoleSpy = vi.spyOn(console, 'error')
            const logger = createLogger({ mirrorToConsole: true })

            logger.error('FILESYSTEM', 'Error message')

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[ERROR] [FILESYSTEM] Error message')
            )

            consoleSpy.mockRestore()
        })

        it('should use console.warn for warn level', () => {
            const consoleSpy = vi.spyOn(console, 'warn')
            const logger = createLogger({ mirrorToConsole: true })

            logger.warn('EXECUTOR', 'Warning message')

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[WARN] [EXECUTOR] Warning message')
            )

            consoleSpy.mockRestore()
        })

        it('should not mirror when disabled', () => {
            const consoleSpy = vi.spyOn(console, 'log')
            const logger = createLogger({ mirrorToConsole: false })

            logger.info('COMMAND', 'Test message')

            expect(consoleSpy).not.toHaveBeenCalled()

            consoleSpy.mockRestore()
        })
    })

    describe('immutability', () => {
        it('should return a copy of entries, not original array', () => {
            logger.info('COMMAND', 'Test')

            const entries1 = logger.getEntries()
            const entries2 = logger.getEntries()

            expect(entries1).not.toBe(entries2) // Different array instances
            expect(entries1).toEqual(entries2)  // But same content
        })
    })
})

