var { app } = require('electron')
// not sure if this is the right thing to do
if (!app) {
    var { app } = require('electron').remote
}
const fs = require('fs')
const Path = require('path')

class FileManager {

    static basePath = app.getPath('userData')
    static logsPath = `${FileManager.basePath}/logs`
    static recordingsPath = `${this.basePath}/recordings`
    static thumbnailsPath = `${this.basePath}/thumbnails`

    static prepareFileSystem() {
        FileManager.initFolderIfNeeded(FileManager.logsPath)
        FileManager.initFolderIfNeeded(FileManager.recordingsPath)
        FileManager.initFolderIfNeeded(FileManager.thumbnailsPath)
    }

    static initFolderIfNeeded(folder) {
        fs.mkdir(folder, _ => { })
        FileManager.deleteFolderRecursive(folder)
    }

    static deleteFolderRecursive(path) {
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

module.exports = {
    prepareFileSystem: FileManager.prepareFileSystem,
    logsPath: FileManager.logsPath,
    recordingsPath: FileManager.recordingsPath,
    thumbnailsPath: FileManager.thumbnailsPath
}