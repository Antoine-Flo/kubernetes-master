import './style.css'
import { createTerminalManager } from './terminal/TerminalManager'

// kubectl simulator entry point
const terminalContainer = document.getElementById('terminal')

if (!terminalContainer) {
    throw new Error('Terminal container not found')
}

const terminal = createTerminalManager(terminalContainer)

// Welcome message
terminal.write('Welcome to kubectl Simulator\r\n')
terminal.write('Type kubectl commands to interact with the virtual cluster\r\n')

// Show prompt and focus terminal
terminal.showPrompt()
terminal.focus()

// Handle commands (for now, just log them)
terminal.onCommand((command) => {
    console.log('Command received:', command)
    terminal.write(`Command not yet implemented: ${command}\r\n`)
})
