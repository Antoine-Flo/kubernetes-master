import { Terminal } from '@xterm/xterm'

type CommandCallback = (command: string) => void

interface TerminalManager {
    write: (text: string) => void
    onCommand: (callback: CommandCallback) => void
    simulateInput: (data: string) => void
    showPrompt: () => void
    focus: () => void
}

const PROMPT = 'kubectl> '

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

    const showPrompt = (): void => {
        terminal.write(PROMPT)
    }

    const handleEnter = (): void => {
        terminal.write('\r\n')

        const command = currentLine.trim()
        if (commandCallback && command) {
            commandCallback(command)
        }

        currentLine = ''
        showPrompt()
    }

    const handleBackspace = (): void => {
        if (currentLine.length === 0) {
            return
        }

        currentLine = currentLine.slice(0, -1)
        terminal.write('\b \b')
    }

    const handleInput = (data: string): void => {
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
        focus: () => terminal.focus(),
    }
}

