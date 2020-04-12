const fs = require('fs')
const { app, shell } = require('electron')
const { logsPath } = require('./file-manager')

class Logger {

    constructor() {
        this.content = ""
        this.fileName = `${logsPath}/${this.logFileName()}`
    }

    diagnosticLog(string) {
        this.content += `\n${string}`
        try { fs.writeFileSync(this.fileName, this.content, 'utf-8') }
        catch (error) { console.log(`Can't save log. Error: ${error}`) }
    }

    showLogs() {
        shell.openItem(this.fileName)
    }

    logFileName() {
        let date = new Date()
        let dateAsSting = new Intl.DateTimeFormat('en-US',
            {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            })
            .format(date)
            .replace(/:/g, '.')
            .replace(/\//g, '-')
            .replace(', ', '-')
        return `${dateAsSting}.log`
    }
}

let logger = new Logger()

function diagnosticLog(string) {
    logger.diagnosticLog(string)
}

function showLogs() {
    logger.showLogs()
}

module.exports = {
    diagnosticLog: diagnosticLog,
    showLogs: showLogs
}
