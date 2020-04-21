var { app } = require('electron')
// not sure if this is the right thing to do
if (!app) {
    var { app } = require('electron').remote
}
const fs = require('fs')
const Path = require('path')

class FileManager {

    constructor() {
        this.basePath = app.getPath('userData')
        this.logsPath = `${this.basePath}/logs`
        this.recordingsPath = `${this.basePath}/recordings`
        this.thumbnailsPath = `${this.basePath}/thumbnails`
        // this.initFolderIfNeeded(this.logsPath)
        // this.initFolderIfNeeded(this.recordingsPath)
        this.initFolderIfNeeded(this.thumbnailsPath)
    }

    initFolderIfNeeded(folder) {
        fs.mkdir(folder, _ => { })
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
    recordingsPath: fileManager.recordingsPath,
    thumbnailsPath: fileManager.thumbnailsPath
}