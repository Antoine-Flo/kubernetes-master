import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
    formatAge,
    formatDate,
    formatSize,
    formatPermissions,
    calculateColumnWidths,
    padCell,
    formatTable,
    formatColumns,
    formatLongListing,
    formatKeyValue,
    type FileEntry,
    type TableOptions,
    type ColumnOptions,
    type KeyValueOptions
} from '../../../src/shared/formatter'

// ═══════════════════════════════════════════════════════════════════════════
// FORMATTER TESTS - TDD APPROACH
// ═══════════════════════════════════════════════════════════════════════════
// Tests for shell-like formatters (kubectl, ls, etc.)
// Following RED-GREEN-REFACTOR cycle

describe('Formatter - Helpers', () => {
    // ─── formatAge() ─────────────────────────────────────────────────────────

    describe('formatAge()', () => {
        beforeEach(() => {
            // Mock current time to 2025-10-16 12:00:00
            vi.useFakeTimers()
            vi.setSystemTime(new Date('2025-10-16T12:00:00Z'))
        })

        it('should format age in seconds', () => {
            const timestamp = '2025-10-16T11:59:30Z' // 30 seconds ago
            expect(formatAge(timestamp)).toBe('30s')
        })

        it('should format age in minutes', () => {
            const timestamp = '2025-10-16T11:55:00Z' // 5 minutes ago
            expect(formatAge(timestamp)).toBe('5m')
        })

        it('should format age in hours', () => {
            const timestamp = '2025-10-16T09:00:00Z' // 3 hours ago
            expect(formatAge(timestamp)).toBe('3h')
        })

        it('should format age in days', () => {
            const timestamp = '2025-10-14T12:00:00Z' // 2 days ago
            expect(formatAge(timestamp)).toBe('2d')
        })

        it('should handle very recent timestamps (< 1 second)', () => {
            const timestamp = '2025-10-16T12:00:00Z' // now
            expect(formatAge(timestamp)).toBe('0s')
        })
    })

    // ─── formatDate() ────────────────────────────────────────────────────────

    describe('formatDate()', () => {
        beforeEach(() => {
            vi.useFakeTimers()
            vi.setSystemTime(new Date('2025-10-16T12:00:00Z'))
        })

        it('should format recent date with time (< 6 months)', () => {
            const timestamp = '2025-09-15T10:30:00Z'
            expect(formatDate(timestamp)).toBe('Sep 15 10:30')
        })

        it('should format old date with year (> 6 months)', () => {
            const timestamp = '2024-01-15T10:30:00Z'
            expect(formatDate(timestamp)).toBe('Jan 15  2024')
        })

        it('should pad day with space for single digits', () => {
            const timestamp = '2025-09-05T10:30:00Z'
            expect(formatDate(timestamp)).toBe('Sep  5 10:30')
        })

        it('should handle midnight time', () => {
            const timestamp = '2025-09-15T00:00:00Z'
            expect(formatDate(timestamp)).toBe('Sep 15 00:00')
        })
    })

    // ─── formatSize() ────────────────────────────────────────────────────────

    describe('formatSize()', () => {
        it('should format bytes', () => {
            expect(formatSize(512)).toBe('512')
            expect(formatSize(1023)).toBe('1023')
        })

        it('should format kilobytes', () => {
            expect(formatSize(1024)).toBe('1K')
            expect(formatSize(2048)).toBe('2K')
            expect(formatSize(1536)).toBe('1.5K')
        })

        it('should format megabytes', () => {
            expect(formatSize(1048576)).toBe('1M')
            expect(formatSize(2097152)).toBe('2M')
            expect(formatSize(1572864)).toBe('1.5M')
        })

        it('should format gigabytes', () => {
            expect(formatSize(1073741824)).toBe('1G')
            expect(formatSize(2147483648)).toBe('2G')
        })

        it('should handle zero bytes', () => {
            expect(formatSize(0)).toBe('0')
        })
    })

    // ─── formatPermissions() ─────────────────────────────────────────────────

    describe('formatPermissions()', () => {
        it('should format directory permissions', () => {
            expect(formatPermissions('directory')).toBe('d---')
        })

        it('should format file permissions', () => {
            expect(formatPermissions('file')).toBe('----')
        })
    })

    // ─── calculateColumnWidths() ─────────────────────────────────────────────

    describe('calculateColumnWidths()', () => {
        it('should calculate widths for simple table', () => {
            const rows = [
                ['Name', 'Age'],
                ['Alice', '30'],
                ['Bob', '25']
            ]
            expect(calculateColumnWidths(rows)).toEqual([5, 3])
        })

        it('should handle varying column widths', () => {
            const rows = [
                ['Short', 'VeryLongColumnName'],
                ['X', 'Y']
            ]
            expect(calculateColumnWidths(rows)).toEqual([5, 18])
        })

        it('should handle empty rows array', () => {
            expect(calculateColumnWidths([])).toEqual([])
        })

        it('should handle single row', () => {
            const rows = [['Header1', 'Header2', 'Header3']]
            expect(calculateColumnWidths(rows)).toEqual([7, 7, 7])
        })
    })

    // ─── padCell() ───────────────────────────────────────────────────────────

    describe('padCell()', () => {
        it('should pad left aligned text', () => {
            expect(padCell('foo', 5, 'left')).toBe('foo  ')
        })

        it('should pad right aligned text', () => {
            expect(padCell('foo', 5, 'right')).toBe('  foo')
        })

        it('should not pad if text is already at width', () => {
            expect(padCell('hello', 5, 'left')).toBe('hello')
        })

        it('should not truncate if text exceeds width', () => {
            expect(padCell('verylongtext', 5, 'left')).toBe('verylongtext')
        })
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// TABLE FORMATTER - kubectl style
// ═══════════════════════════════════════════════════════════════════════════

describe('formatTable() - kubectl style', () => {
    it('should format simple table with headers and rows', () => {
        const result = formatTable(
            ['name', 'status', 'age'],
            [
                ['nginx', 'Running', '5m'],
                ['redis', 'Running', '10m']
            ]
        )

        const expected = [
            'NAME   STATUS   AGE',
            'nginx  Running  5m',
            'redis  Running  10m'
        ].join('\n')

        expect(result).toBe(expected)
    })

    it('should auto-align numbers to the right', () => {
        const result = formatTable(
            ['name', 'count'],
            [
                ['item1', '5'],
                ['item2', '100']
            ]
        )

        const expected = [
            'NAME   COUNT',
            'item1      5',
            'item2    100'
        ].join('\n')

        expect(result).toBe(expected)
    })

    it('should handle varying column widths', () => {
        const result = formatTable(
            ['short', 'verylongheader'],
            [
                ['a', 'b'],
                ['cd', 'ef']
            ]
        )

        const expected = [
            'SHORT  VERYLONGHEADER',
            'a      b',
            'cd     ef'
        ].join('\n')

        expect(result).toBe(expected)
    })

    it('should respect uppercase option (false)', () => {
        const result = formatTable(
            ['name', 'age'],
            [['alice', '30']],
            { uppercase: false }
        )

        // name is padded to alice's width (5), then spacing (2), then age
        expect(result).toContain('name   age')
    })

    it('should use custom spacing', () => {
        const result = formatTable(
            ['a', 'b'],
            [['1', '2']],
            { spacing: 4 }
        )

        expect(result).toContain('A    B')
    })

    it('should handle empty rows (headers only)', () => {
        const result = formatTable(['name', 'age'], [])
        expect(result).toBe('NAME  AGE')
    })

    it('should handle single row', () => {
        const result = formatTable(
            ['name'],
            [['value']]
        )

        expect(result).toBe('NAME\nvalue')
    })

    it('should handle empty headers', () => {
        const result = formatTable([], [])
        expect(result).toBe('')
    })

    it('should allow custom alignment per column', () => {
        const result = formatTable(
            ['text', 'number'],
            [['foo', '42']],
            { align: ['left', 'right'] }
        )

        const lines = result.split('\n')
        expect(lines[1]).toBe('foo       42')
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// COLUMN FORMATTER - ls style
// ═══════════════════════════════════════════════════════════════════════════

describe('formatColumns() - ls style', () => {
    it('should format simple list on one line', () => {
        const result = formatColumns(['file1', 'file2', 'file3'])
        expect(result).toBe('file1  file2  file3')
    })

    it('should sort items alphabetically by default', () => {
        const result = formatColumns(['file3', 'file1', 'file2'])
        expect(result).toBe('file1  file2  file3')
    })

    it('should respect sort option (false)', () => {
        const result = formatColumns(['file3', 'file1', 'file2'], { sort: false })
        expect(result).toBe('file3  file1  file2')
    })

    it('should use custom spacing', () => {
        const result = formatColumns(['a', 'b', 'c'], { spacing: 4 })
        expect(result).toBe('a    b    c')
    })

    it('should handle empty list', () => {
        const result = formatColumns([])
        expect(result).toBe('')
    })

    it('should handle single item', () => {
        const result = formatColumns(['file1'])
        expect(result).toBe('file1')
    })

    it('should join with spacing if exceeds terminal width', () => {
        const result = formatColumns(
            ['verylongfilename1', 'verylongfilename2', 'verylongfilename3'],
            { terminalWidth: 20 }
        )
        // Should still join with spacing (terminal wraps naturally)
        expect(result).toBe('verylongfilename1  verylongfilename2  verylongfilename3')
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// LONG LISTING FORMATTER - ls -l style
// ═══════════════════════════════════════════════════════════════════════════

describe('formatLongListing() - ls -l style', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2025-10-16T12:00:00Z'))
    })

    it('should format single file entry', () => {
        const entries: FileEntry[] = [
            { type: 'file', name: 'README.md', size: 1234, modified: '2025-09-15T10:30:00Z' }
        ]

        const result = formatLongListing(entries)
        expect(result).toBe('----  1234  Sep 15 10:30  README.md')
    })

    it('should format single directory entry', () => {
        const entries: FileEntry[] = [
            { type: 'directory', name: 'src', size: 512, modified: '2025-09-15T10:30:00Z' }
        ]

        const result = formatLongListing(entries)
        expect(result).toBe('d---  512  Sep 15 10:30  src')
    })

    it('should format multiple mixed entries', () => {
        const entries: FileEntry[] = [
            { type: 'directory', name: 'examples', size: 512, modified: '2025-09-15T10:30:00Z' },
            { type: 'file', name: 'pod.yaml', size: 1234, modified: '2025-09-15T11:45:00Z' }
        ]

        const result = formatLongListing(entries)
        const lines = result.split('\n')

        expect(lines[0]).toBe('d---   512  Sep 15 10:30  examples')
        expect(lines[1]).toBe('----  1234  Sep 15 11:45  pod.yaml')
    })

    it('should align size column to the right', () => {
        const entries: FileEntry[] = [
            { type: 'file', name: 'small.txt', size: 10, modified: '2025-09-15T10:30:00Z' },
            { type: 'file', name: 'large.txt', size: 1000, modified: '2025-09-15T10:30:00Z' }
        ]

        const result = formatLongListing(entries)
        const lines = result.split('\n')

        expect(lines[0]).toBe('----    10  Sep 15 10:30  small.txt')
        expect(lines[1]).toBe('----  1000  Sep 15 10:30  large.txt')
    })

    it('should format recent dates with time', () => {
        const entries: FileEntry[] = [
            { type: 'file', name: 'recent.txt', size: 100, modified: '2025-09-15T14:30:00Z' }
        ]

        const result = formatLongListing(entries)
        expect(result).toContain('Sep 15 14:30')
    })

    it('should format old dates with year', () => {
        const entries: FileEntry[] = [
            { type: 'file', name: 'old.txt', size: 100, modified: '2024-01-15T10:30:00Z' }
        ]

        const result = formatLongListing(entries)
        expect(result).toContain('Jan 15  2024')
    })

    it('should handle empty entries list', () => {
        const result = formatLongListing([])
        expect(result).toBe('')
    })

    it('should format sizes as raw bytes (ls -l style)', () => {
        const entries: FileEntry[] = [
            { type: 'file', name: 'small.txt', size: 512, modified: '2025-09-15T10:30:00Z' },
            { type: 'file', name: 'medium.txt', size: 1024, modified: '2025-09-15T10:30:00Z' },
            { type: 'file', name: 'large.txt', size: 1048576, modified: '2025-09-15T10:30:00Z' }
        ]

        const result = formatLongListing(entries)
        // ls -l shows raw bytes by default (not human-readable)
        expect(result).toContain('512')
        expect(result).toContain('1024')
        expect(result).toContain('1048576')
    })
})

// ═══════════════════════════════════════════════════════════════════════════
// KEY-VALUE FORMATTER - kubectl describe style
// ═══════════════════════════════════════════════════════════════════════════

describe('formatKeyValue() - kubectl describe style', () => {
    it('should format simple key-value pairs', () => {
        const pairs = {
            'Name': 'nginx-pod',
            'Namespace': 'default',
            'Status': 'Running'
        }

        const result = formatKeyValue(pairs)
        const expected = [
            'Name:       nginx-pod',
            'Namespace:  default',
            'Status:     Running'
        ].join('\n')

        expect(result).toBe(expected)
    })

    it('should align keys by padding', () => {
        const pairs = {
            'Name': 'pod',
            'VeryLongKey': 'value'
        }

        const result = formatKeyValue(pairs)
        const lines = result.split('\n')

        // Keys should be padded to same width
        expect(lines[0]).toBe('Name:         pod')
        expect(lines[1]).toBe('VeryLongKey:  value')
    })

    it('should handle numeric values', () => {
        const pairs = {
            'Count': 42,
            'Size': 1024
        }

        const result = formatKeyValue(pairs)
        expect(result).toContain('Count:  42')
        expect(result).toContain('Size:   1024')
    })

    it('should use custom separator', () => {
        const pairs = { 'Name': 'value' }
        const result = formatKeyValue(pairs, { separator: ': ' })

        expect(result).toBe('Name: value')
    })

    it('should respect maxKeyWidth option', () => {
        const pairs = {
            'VeryLongKeyName': 'value1',
            'Short': 'value2'
        }

        const result = formatKeyValue(pairs, { maxKeyWidth: 10 })
        const lines = result.split('\n')

        // With maxKeyWidth=10, Short gets padded to 10 chars
        expect(lines[0]).toBe('VeryLongKeyName:  value1')
        expect(lines[1]).toBe('Short:       value2')
    })

    it('should handle empty pairs', () => {
        const result = formatKeyValue({})
        expect(result).toBe('')
    })
})

