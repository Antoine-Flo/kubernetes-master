import { Terminal } from '@xterm/xterm'
import { getCompletions, getCommonPrefix, formatSuggestions, type AutocompleteContext } from './autocomplete'

type CommandCallback = (command: string) => void

interface TerminalManager {
    write: (text: string) => void
    onCommand: (callback: CommandCallback) => void
    simulateInput: (data: string) => void
    showPrompt: () => void
    setPrompt: (newPrompt: string) => void
    focus: () => void
}

export const createTerminalManager = (
    container: HTMLElement,
    autocompleteContext?: AutocompleteContext
): TerminalManager => {
    const terminal = new Terminal({
        cursorBlink: true,
        scrollback: 1000,
        rows: 24,
        theme: {
            background: '#1d232a',
            foreground: '#a6adbb',
            cursor: '#a6adbb',
        },
    })

    let currentLine = ''
    let cursorPosition = 0 // Position of cursor in currentLine (0 = start)
    let commandCallback: CommandCallback | undefined
    let prompt = 'kubectl> '
    const commandHistory: string[] = []
    let historyIndex = -1
    let tempCurrentLine = ''
    let lastTabPress = 0

    const showPrompt = (): void => {
        terminal.write(prompt)
    }

    const setPrompt = (newPrompt: string): void => {
        prompt = newPrompt
    }

    const handleEnter = (): void => {
        terminal.write('\r\n')

        const command = currentLine.trim()
        if (commandCallback && command) {
            // Add to history (max 100 commands)
            commandHistory.push(command)
            if (commandHistory.length > 100) {
                commandHistory.shift()
            }
            commandCallback(command)
        }

        currentLine = ''
        cursorPosition = 0
        historyIndex = -1
        tempCurrentLine = ''
        showPrompt()
    }

    const handleBackspace = (): void => {
        if (currentLine.length === 0 || cursorPosition === 0) {
            return
        }

        // Remove character before cursor
        currentLine = currentLine.slice(0, cursorPosition - 1) + currentLine.slice(cursorPosition)
        cursorPosition--

        // Move cursor back, clear to end, then redraw
        const remaining = currentLine.slice(cursorPosition)
        terminal.write('\b') // Move cursor left
        terminal.write('\x1b[K') // Clear to end of line
        terminal.write(remaining)
        // Move cursor back to correct position
        for (let i = 0; i < remaining.length; i++) {
            terminal.write('\b')
        }
    }

    const clearLine = (): void => {
        // Move cursor to start of line and clear
        for (let i = 0; i < currentLine.length; i++) {
            terminal.write('\b \b')
        }
        currentLine = ''
        cursorPosition = 0
    }

    const navigateHistory = (direction: 'up' | 'down'): void => {
        if (commandHistory.length === 0) return

        // Save current line when first entering history
        if (historyIndex === -1 && direction === 'up') {
            tempCurrentLine = currentLine
        }

        // Calculate new index
        if (direction === 'up') {
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++
            }
        } else {
            if (historyIndex > -1) {
                historyIndex--
            }
        }

        // Clear current line
        clearLine()

        // Show command from history or temp line
        if (historyIndex === -1) {
            currentLine = tempCurrentLine
        } else {
            const historyPosition = commandHistory.length - 1 - historyIndex
            currentLine = commandHistory[historyPosition]
        }

        terminal.write(currentLine)
        cursorPosition = currentLine.length
    }

    const moveCursorLeft = (): void => {
        if (cursorPosition > 0) {
            cursorPosition--
            terminal.write('\x1b[D') // ANSI escape code for cursor left
        }
    }

    const moveCursorRight = (): void => {
        if (cursorPosition < currentLine.length) {
            cursorPosition++
            terminal.write('\x1b[C') // ANSI escape code for cursor right
        }
    }

    const getCurrentToken = (): string => {
        if (currentLine.endsWith(' ')) return ''
        const lastSpace = currentLine.lastIndexOf(' ')
        if (lastSpace === -1) return currentLine
        return currentLine.slice(lastSpace + 1)
    }

    const handleTab = (): void => {
        // Skip if no autocomplete context provided
        if (!autocompleteContext) return

        const now = Date.now()
        const isDoubleTap = (now - lastTabPress) < 500
        lastTabPress = now

        const completions = getCompletions(currentLine, autocompleteContext)

        if (completions.length === 0) return

        if (completions.length === 1) {
            // Single match - complete it and add space
            const completion = completions[0]
            const currentToken = getCurrentToken()
            const toAdd = completion.slice(currentToken.length) + ' '
            currentLine += toAdd
            cursorPosition = currentLine.length
            terminal.write(toAdd)
        } else if (isDoubleTap) {
            // Double tab - show all options
            terminal.write('\r\n')
            terminal.write(formatSuggestions(completions))
            terminal.write('\r\n')
            showPrompt()
            terminal.write(currentLine)
            cursorPosition = currentLine.length
        } else {
            // Single tab - complete common prefix
            const prefix = getCommonPrefix(completions)
            const currentToken = getCurrentToken()
            const toAdd = prefix.slice(currentToken.length)
            if (toAdd) {
                currentLine += toAdd
                cursorPosition = currentLine.length
                terminal.write(toAdd)
            }
        }
    }

    const handleInput = (data: string): void => {
        // Handle arrow keys (ANSI escape sequences)
        if (data === '\x1b[A') {
            navigateHistory('up')
            return
        }

        if (data === '\x1b[B') {
            navigateHistory('down')
            return
        }

        if (data === '\x1b[C') {
            moveCursorRight()
            return
        }

        if (data === '\x1b[D') {
            moveCursorLeft()
            return
        }

        const charCode = data.charCodeAt(0)

        if (charCode === 9) {
            handleTab()
            return
        }

        if (charCode === 13) {
            handleEnter()
            return
        }

        if (charCode === 127) {
            handleBackspace()
            return
        }

        if (charCode < 32) {
            return
        }

        // Reset history navigation when typing - keep line content for editing
        if (historyIndex !== -1) {
            historyIndex = -1
            tempCurrentLine = ''
            // Don't clear the line - user wants to edit the history command
        }

        // Insert character at cursor position
        currentLine = currentLine.slice(0, cursorPosition) + data + currentLine.slice(cursorPosition)
        cursorPosition++

        // Clear from cursor to end of line, then redraw
        const remaining = currentLine.slice(cursorPosition - 1)
        terminal.write('\x1b[K') // Clear to end of line
        terminal.write(remaining)
        // Move cursor back to correct position
        for (let i = 0; i < remaining.length - 1; i++) {
            terminal.write('\b')
        }
    }

    const setupInputHandling = (): void => {
        terminal.onData((data) => {
            handleInput(data)
        })
    }

    // Initialize terminal
    terminal.open(container)
    setupInputHandling()

    // Return public API
    return {
        write: (text: string) => terminal.write(text),
        onCommand: (callback: CommandCallback) => {
            commandCallback = callback
        },
        simulateInput: (data: string) => {
            // Process each character separately for multi-char strings
            if (data.length > 1 && !data.startsWith('\x1b')) {
                for (const char of data) {
                    handleInput(char)
                }
            } else {
                handleInput(data)
            }
        },
        showPrompt,
        setPrompt,
        focus: () => terminal.focus(),
    }
}

