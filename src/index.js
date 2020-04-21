const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron')
const SimulatorsController = require('./simulators-controller')
const { spawnServer, startRecordingGestures, stopRecordingGestures } = require('./gestures-server')
require('electron-reload')(__dirname)

let settingsWindow = null
let tray
let contextMenu
let simulatorsController = new SimulatorsController(reloadTray)
let server = spawnServer(3000)

function createWindow() {
    let window = new BrowserWindow({ show: false })
    // app.dock.hide()

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
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true
        }
    })
    videoPreviewWindow.loadURL(`file://${__dirname}/video-preview.html`)
    videoPreviewWindow.on('closed', () => {
        videoPreviewWindow = null
    })
    videoPreviewWindow.openDevTools()
    videoPreviewWindow.show()
    videoPreviewWindow.webContents.on('did-finish-load', _ => {
        videoPreviewWindow.webContents.send('video-path', videoPath)
        videoPreviewWindow.webContents.send('timeline', timeline)
    })
}

app.on('ready', () => {
    createWindow()
    createTray()
    // debugPreview()
})

function debugPreview() {
    let timeline = '[{"event":"start","timestamp":1587476841.631},{"event":"gesture","touches":[{"location":{"x":547,"y":222},"timestamp":1.1422123908996582},{"location":{"x":547,"y":222},"timestamp":1.1937718391418457}]},{"event":"gesture","touches":[{"location":{"x":502,"y":307},"timestamp":2.0491743087768555},{"location":{"x":502,"y":307},"timestamp":2.129047155380249}]},{"event":"gesture","touches":[{"location":{"x":453,"y":402},"timestamp":2.89329195022583},{"location":{"x":453,"y":402},"timestamp":2.961702823638916}]},{"event":"gesture","touches":[{"location":{"x":422,"y":484},"timestamp":3.749833583831787},{"location":{"x":422,"y":484},"timestamp":3.8188562393188477}]},{"event":"gesture","touches":[{"location":{"x":406,"y":573},"timestamp":4.723596572875977},{"location":{"x":407,"y":573},"timestamp":4.854743003845215},{"location":{"x":420,"y":573},"timestamp":4.877360820770264},{"location":{"x":445,"y":573},"timestamp":4.902065992355347},{"location":{"x":484,"y":573},"timestamp":4.924854278564453},{"location":{"x":501,"y":573},"timestamp":4.940964698791504},{"location":{"x":522,"y":573},"timestamp":4.957448720932007},{"location":{"x":547,"y":573},"timestamp":4.973488807678223},{"location":{"x":564,"y":573},"timestamp":4.992137432098389},{"location":{"x":593,"y":573},"timestamp":5.013144016265869},{"location":{"x":619,"y":573},"timestamp":5.0369873046875},{"location":{"x":638,"y":573},"timestamp":5.061030626296997},{"location":{"x":648,"y":573},"timestamp":5.0771448612213135},{"location":{"x":653,"y":573},"timestamp":5.100985765457153},{"location":{"x":655,"y":573},"timestamp":5.124697208404541},{"location":{"x":659,"y":574},"timestamp":5.141000270843506},{"location":{"x":665,"y":576},"timestamp":5.164789199829102},{"location":{"x":669,"y":576},"timestamp":5.1808671951293945},{"location":{"x":671,"y":576},"timestamp":5.196912050247192},{"location":{"x":673,"y":576},"timestamp":5.221059799194336},{"location":{"x":674,"y":576},"timestamp":5.2546610832214355},{"location":{"x":672,"y":576},"timestamp":5.38922643661499},{"location":{"x":651,"y":576},"timestamp":5.406821966171265},{"location":{"x":576,"y":583},"timestamp":5.428946256637573},{"location":{"x":454,"y":591},"timestamp":5.454622268676758},{"location":{"x":323,"y":600},"timestamp":5.476742506027222},{"location":{"x":252,"y":608},"timestamp":5.4928669929504395},{"location":{"x":187,"y":616},"timestamp":5.5094664096832275},{"location":{"x":94,"y":627},"timestamp":5.532684803009033},{"location":{"x":53,"y":633},"timestamp":5.549487829208374},{"location":{"x":0,"y":639},"timestamp":5.573775768280029}]},{"event":"gesture","touches":[{"location":{"x":400,"y":1015},"timestamp":6.444526433944702},{"location":{"x":401,"y":1012},"timestamp":6.510753631591797},{"location":{"x":401,"y":975},"timestamp":6.532689571380615},{"location":{"x":401,"y":923},"timestamp":6.54946231842041},{"location":{"x":401,"y":866},"timestamp":6.5657713413238525},{"location":{"x":401,"y":759},"timestamp":6.588754415512085},{"location":{"x":401,"y":701},"timestamp":6.6075825691223145},{"location":{"x":401,"y":634},"timestamp":6.62890625},{"location":{"x":401,"y":554},"timestamp":6.652742385864258},{"location":{"x":401,"y":488},"timestamp":6.6690239906311035},{"location":{"x":424,"y":297},"timestamp":6.692881107330322},{"location":{"x":433,"y":207},"timestamp":6.709079742431641},{"location":{"x":455,"y":74},"timestamp":6.7368080615997314}]},{"event":"gesture","touches":[{"location":{"x":116,"y":127},"timestamp":7.770904064178467},{"location":{"x":116,"y":127},"timestamp":7.862418174743652}]},{"event":"gesture","touches":[{"location":{"x":116,"y":127},"timestamp":8.50296425819397},{"location":{"x":116,"y":127},"timestamp":8.597821712493896}]},{"event":"gesture","touches":[{"location":{"x":116,"y":127},"timestamp":9.211666584014893},{"location":{"x":116,"y":127},"timestamp":9.317934036254883}]},{"event":"gesture","touches":[{"location":{"x":116,"y":127},"timestamp":9.979832649230957},{"location":{"x":116,"y":127},"timestamp":10.0610032081604}]},{"event":"end"}]'
    let videoPath = '/Users/mario/Library/Application Support/Sivire/recordings/Simulator Recording - iPhone 11 - 04-21-2020 at 15.47.21.mov'
    openVideoPreviewWindow(videoPath, JSON.parse(timeline))
}
