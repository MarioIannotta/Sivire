const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron')
const { spawnServer, startRecordingGestures, stopRecordingGestures } = require('./gestures-server')
const { prepareFileSystem } = require('./file-manager')
const SimulatorsController = require('./simulators-controller')

if (process.env.NODE_ENV === 'development') {
    require('electron-reload')(__dirname)
}

let settingsWindow = null
let tray
let contextMenu
let simulatorsController = new SimulatorsController(reloadTray)
let server = spawnServer(3000)

function createMainWindow() {
    let window = new BrowserWindow({ show: false })
    app.dock.hide()

    window.loadURL(`file://${__dirname}/index.html`)
    window.on('closed', () => {
        window = null
    })
}

function createTray() {
    tray = new Tray(makeTrayImage())
    tray.on('click', _ => {
        let recordingSimulator = simulatorsController.recordingSimulator()
        if (recordingSimulator) {
            let videoPath = simulatorsController.stopRecording()
            let timeline = stopRecordingGestures(server)
            openVideoPreviewWindow(videoPath, timeline)
        } else {
            tray.popUpContextMenu(contextMenu)
        }
    })
}

function makeTrayImage() {
    let imageName
    if (simulatorsController.recordingSimulator()) {
        imageName = "TrayIconRecording"
    } else {
        imageName = "TrayIcon"
    }
    let image = nativeImage.createFromPath(`${__dirname}/images/${imageName}.png`)
    image.isMacTemplateImage = true
    return image
}

function reloadTray(simulatorsController) {
    let title = ''
    let tooltip = ''
    let recordingSimulator = simulatorsController.recordingSimulator()
    if (recordingSimulator) {
        title = 'Recording ' + recordingSimulator.name
        tooltip = 'Click to stop'
    } else {
        contextMenu = makeContextMenu(simulatorsController.isLoading, simulatorsController.runtimes, (selectedUDID) => {
            simulatorsController.startRecording(selectedUDID)
            startRecordingGestures(server)
        })
        tooltip = 'Click to select a simulator'
    }
    tray.setTitle(title)
    tray.setToolTip(tooltip)
    tray.setImage(makeTrayImage())
}

function makeContextMenu(isLoading, runtimes, onUDIDSelected) {
    let template = runtimes.reduce((template, runtime) => {
        let menuHeader = {
            label: runtime.name,
            enabled: false
        }
        let simulators = runtime.simulators.map(simulator => ({
            label: `${simulator.name}`,
            submenu: [{
                label: 'Start recording',
                click: _ => {
                    onUDIDSelected(simulator.udid)
                }
            }]
        }))
        var currentSection = [menuHeader]
        currentSection.push(...simulators)
        currentSection.push({ type: 'separator' })
        template.push(...currentSection)
        return template
    }, [])
    let isAtLeastOneSimulatorBooted = Array.isArray(template) && template.length
    if (!isAtLeastOneSimulatorBooted) {
        if (isLoading) {
            template = [
                { label: 'Loading simulators...', enabled: false },
                { type: 'separator' }
            ]
        } else {
            template = [
                { label: 'No booted simulator found', enabled: false },
                { type: 'separator' }
            ]
        }
    }
    template.push({ label: 'Preferences', accelerator: 'Cmd+,', click: openSettingsWindow })
    template.push({ role: 'about' })
    template.push({ type: 'separator' })
    template.push({ role: 'quit', accelerator: 'Cmd+Q' })
    return Menu.buildFromTemplate(template)
}

function openSettingsWindow() {
    if (settingsWindow != null) {
        settingsWindow.show()
    } else {
        settingsWindow = new BrowserWindow({
            width: 350,
            height: 200,
            webPreferences: {
                nodeIntegration: true
            }
        })

        settingsWindow.loadURL(`file://${__dirname}/settings.html`)
        settingsWindow.on('closed', () => {
            settingsWindow = null
        })
    }
}

function openVideoPreviewWindow(videoPath, timeline) {
    let videoPreviewWindow = new BrowserWindow({
        width: 780,
        height: 700,
        vibrancy: 'under-window',
        webPreferences: {
            nodeIntegration: true
        }
    })
    videoPreviewWindow.loadURL(`file://${__dirname}/video-preview.html`)
    videoPreviewWindow.on('closed', () => {
        videoPreviewWindow = null
    })
    // videoPreviewWindow.openDevTools()
    videoPreviewWindow.show()
    videoPreviewWindow.webContents.on('did-finish-load', _ => {
        videoPreviewWindow.webContents.send('video-path', videoPath)
        videoPreviewWindow.webContents.send('timeline', timeline)
    })
}

app.on('ready', () => {
    prepareFileSystem()
    createMainWindow()
    createTray()
})