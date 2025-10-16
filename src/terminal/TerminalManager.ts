import { Terminal } from '@xterm/xterm'

type CommandCallback = (command: string) => void

interface TerminalManager {
    write: (text: string) => void
    onCommand: (callback: CommandCallback) => void
    simulateInput: (data: string) => void
    showPrompt: () => void
    setPrompt: (newPrompt: string) => void
    focus: () => void
}

export const createTerminalManager = (container: HTMLElement): TerminalManager => {
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
    let commandCallback: CommandCallback | undefined
    let prompt = 'kubectl> '
    let commandHistory: string[] = []
    let historyIndex = -1
    let tempCurrentLine = ''

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
        historyIndex = -1
        tempCurrentLine = ''
        showPrompt()
    }

    const handleBackspace = (): void => {
        if (currentLine.length === 0) {
            return
        }

        currentLine = currentLine.slice(0, -1)
        terminal.write('\b \b')
    }

    const clearLine = (): void => {
        // Move cursor to start of line and clear
        for (let i = 0; i < currentLine.length; i++) {
            terminal.write('\b \b')
        }
        currentLine = ''
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

        const charCode = data.charCodeAt(0)

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

        // Reset history navigation when typing
        if (historyIndex !== -1) {
            clearLine()
            historyIndex = -1
            tempCurrentLine = ''
        }

        currentLine += data
        terminal.write(data)
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
        simulateInput: (data: string) => handleInput(data),
        showPrompt,
        setPrompt,
        focus: () => terminal.focus(),
    }
}

