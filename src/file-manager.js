const { app } = require('electron')
const fs = require('fs')
const Path = require('path')

class FileManager {

    constructor() {
        this.basePath = app.getPath('userData')
        this.logsPath = `${this.basePath}/logs`
        this.recordingsPath = `${this.basePath}/recordings`
        this.initFolderIfNeeded(this.logsPath)
        this.initFolderIfNeeded(this.recordingsPath)
    }

    initFolderIfNeeded(folder) {
        fs.mkdir(folder, error => { })
        this.deleteFolderRecursive(folder)
    }

    deleteFolderRecursive(path) {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach((file, index) => {
                const curPath = Path.join(path, file)
                if (fs.lstatSync(curPath).isDirectory()) {
                    deleteFolderRecursive(curPath)
                } else {
                    fs.unlinkSync(curPath)
                }
            })
        }
    }
}

let fileManager = new FileManager()

module.exports = {
    logsPath: fileManager.logsPath,
    recordingsPath: fileManager.recordingsPath
}