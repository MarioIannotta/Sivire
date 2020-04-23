const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron')
const { spawnServer, startRecordingGestures, stopRecordingGestures } = require('./gestures-server')
const { prepareFileSystem } = require('./file-manager')
const SimulatorsController = require('./simulators-controller')
require('electron-reload')(__dirname)

let settingsWindow = null
let tray
let contextMenu
let simulatorsController = new SimulatorsController(reloadTray)
let server = spawnServer(3000)

function createMainWindow() {
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
            console.log(JSON.stringify(timeline))
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
    // prepareFileSystem()
    createMainWindow()
    createTray()
    // debugPreview()
})

function debugPreview() {
    let timeline = '[{"event":"start","timestamp":1587638192.359},{"event":"gesture","touches":[{"location":{"x":294,"y":248},"timestamp":1.3188774585723877},{"location":{"x":294,"y":248},"timestamp":2.718177080154419}]},{"event":"gesture","touches":[{"location":{"x":431,"y":573},"timestamp":4.436946153640747},{"location":{"x":432,"y":573},"timestamp":4.570013999938965},{"location":{"x":440,"y":573},"timestamp":4.588184356689453},{"location":{"x":458,"y":573},"timestamp":4.610207796096802},{"location":{"x":489,"y":573},"timestamp":4.634236812591553},{"location":{"x":512,"y":573},"timestamp":4.658252477645874},{"location":{"x":533,"y":573},"timestamp":4.674812078475952},{"location":{"x":550,"y":573},"timestamp":4.691879987716675},{"location":{"x":566,"y":573},"timestamp":4.707940340042114},{"location":{"x":591,"y":570},"timestamp":4.730117082595825},{"location":{"x":607,"y":564},"timestamp":4.754033803939819},{"location":{"x":612,"y":559},"timestamp":4.770083904266357},{"location":{"x":618,"y":555},"timestamp":4.786308526992798},{"location":{"x":626,"y":549},"timestamp":4.8098719120025635},{"location":{"x":631,"y":543},"timestamp":4.826202154159546},{"location":{"x":642,"y":536},"timestamp":4.849981069564819},{"location":{"x":650,"y":530},"timestamp":4.865984678268433},{"location":{"x":658,"y":525},"timestamp":4.882169723510742},{"location":{"x":663,"y":522},"timestamp":4.898264646530151},{"location":{"x":668,"y":519},"timestamp":4.922063112258911},{"location":{"x":670,"y":519},"timestamp":4.93832802772522},{"location":{"x":671,"y":519},"timestamp":5.025991916656494},{"location":{"x":672,"y":519},"timestamp":5.122258901596069},{"location":{"x":674,"y":519},"timestamp":5.139033794403076},{"location":{"x":682,"y":519},"timestamp":5.1618664264678955},{"location":{"x":688,"y":519},"timestamp":5.178026437759399},{"location":{"x":694,"y":519},"timestamp":5.201776742935181},{"location":{"x":696,"y":519},"timestamp":5.218078374862671},{"location":{"x":698,"y":519},"timestamp":5.234201908111572},{"location":{"x":697,"y":519},"timestamp":5.387491226196289},{"location":{"x":675,"y":535},"timestamp":5.409822702407837},{"location":{"x":646,"y":555},"timestamp":5.4260194301605225},{"location":{"x":614,"y":577},"timestamp":5.449981451034546},{"location":{"x":584,"y":596},"timestamp":5.4738757610321045},{"location":{"x":565,"y":608},"timestamp":5.4919044971466064},{"location":{"x":549,"y":616},"timestamp":5.507913112640381},{"location":{"x":505,"y":642},"timestamp":5.53003191947937},{"location":{"x":475,"y":656},"timestamp":5.553742170333862},{"location":{"x":451,"y":666},"timestamp":5.569984197616577},{"location":{"x":422,"y":677},"timestamp":5.594080209732056},{"location":{"x":393,"y":690},"timestamp":5.618094205856323},{"location":{"x":368,"y":701},"timestamp":5.642353296279907},{"location":{"x":349,"y":710},"timestamp":5.665827751159668},{"location":{"x":333,"y":715},"timestamp":5.68994402885437},{"location":{"x":326,"y":719},"timestamp":5.707699537277222},{"location":{"x":312,"y":724},"timestamp":5.729745864868164},{"location":{"x":304,"y":728},"timestamp":5.7536633014678955},{"location":{"x":302,"y":729},"timestamp":5.7697203159332275},{"location":{"x":300,"y":729},"timestamp":5.79392671585083},{"location":{"x":300,"y":730},"timestamp":5.866892576217651},{"location":{"x":299,"y":730},"timestamp":5.890383005142212},{"location":{"x":298,"y":730},"timestamp":5.913701295852661},{"location":{"x":295,"y":732},"timestamp":5.9300501346588135},{"location":{"x":287,"y":733},"timestamp":5.9540321826934814},{"location":{"x":282,"y":734},"timestamp":5.977941513061523},{"location":{"x":279,"y":734},"timestamp":6.009754657745361},{"location":{"x":278,"y":735},"timestamp":6.073928117752075},{"location":{"x":278,"y":735},"timestamp":6.5096681118011475}]},{"event":"gesture","touches":[{"location":{"x":470,"y":311},"timestamp":7.27284836769104},{"location":{"x":470,"y":311},"timestamp":7.413487434387207}]},{"event":"gesture","touches":[{"location":{"x":462,"y":417},"timestamp":8.077924728393555},{"location":{"x":462,"y":417},"timestamp":8.182302713394165}]},{"event":"gesture","touches":[{"location":{"x":452,"y":511},"timestamp":8.83696961402893},{"location":{"x":452,"y":511},"timestamp":8.942333459854126}]},{"event":"gesture","touches":[{"location":{"x":78,"y":113},"timestamp":9.768217325210571},{"location":{"x":78,"y":113},"timestamp":9.846763849258423}]},{"event":"gesture","touches":[{"location":{"x":79,"y":114},"timestamp":10.47401213645935},{"location":{"x":79,"y":114},"timestamp":10.621912717819214}]},{"event":"gesture","touches":[{"location":{"x":79,"y":114},"timestamp":11.19313359260559},{"location":{"x":79,"y":114},"timestamp":12.204455614089966}]},{"event":"gesture","touches":[{"location":{"x":13,"y":333},"timestamp":14.12869381904602},{"location":{"x":14,"y":333},"timestamp":14.360155820846558},{"location":{"x":21,"y":333},"timestamp":14.385690450668335},{"location":{"x":31,"y":333},"timestamp":14.408753156661987},{"location":{"x":42,"y":333},"timestamp":14.431750059127808},{"location":{"x":47,"y":333},"timestamp":14.447765588760376},{"location":{"x":55,"y":333},"timestamp":14.471521615982056},{"location":{"x":59,"y":333},"timestamp":14.487710237503052},{"location":{"x":62,"y":332},"timestamp":14.503955602645874},{"location":{"x":69,"y":331},"timestamp":14.527726411819458},{"location":{"x":77,"y":331},"timestamp":14.54388976097107},{"location":{"x":87,"y":329},"timestamp":14.5676429271698},{"location":{"x":93,"y":328},"timestamp":14.585352420806885},{"location":{"x":96,"y":328},"timestamp":14.60769248008728},{"location":{"x":98,"y":327},"timestamp":14.641327142715454},{"location":{"x":103,"y":326},"timestamp":14.663746356964111},{"location":{"x":108,"y":324},"timestamp":14.68091082572937},{"location":{"x":116,"y":323},"timestamp":14.69762110710144},{"location":{"x":127,"y":321},"timestamp":14.719768285751343},{"location":{"x":132,"y":320},"timestamp":14.737380743026733},{"location":{"x":143,"y":319},"timestamp":14.76059889793396},{"location":{"x":153,"y":317},"timestamp":14.78555417060852},{"location":{"x":169,"y":314},"timestamp":14.807784795761108},{"location":{"x":187,"y":310},"timestamp":14.833467483520508},{"location":{"x":212,"y":306},"timestamp":14.855709314346313},{"location":{"x":233,"y":303},"timestamp":14.871734857559204},{"location":{"x":258,"y":298},"timestamp":14.88796591758728},{"location":{"x":278,"y":296},"timestamp":14.903989315032959},{"location":{"x":303,"y":292},"timestamp":14.927700281143188},{"location":{"x":320,"y":290},"timestamp":14.943834066390991},{"location":{"x":337,"y":286},"timestamp":14.95987868309021},{"location":{"x":362,"y":284},"timestamp":14.984058141708374},{"location":{"x":381,"y":282},"timestamp":15.008484125137329},{"location":{"x":388,"y":280},"timestamp":15.024956941604614},{"location":{"x":396,"y":280},"timestamp":15.041271924972534},{"location":{"x":412,"y":277},"timestamp":15.063820600509644},{"location":{"x":425,"y":275},"timestamp":15.087774991989136},{"location":{"x":430,"y":274},"timestamp":15.10393738746643},{"location":{"x":435,"y":273},"timestamp":15.127595663070679},{"location":{"x":437,"y":273},"timestamp":15.143990278244019},{"location":{"x":438,"y":272},"timestamp":15.200405836105347},{"location":{"x":438,"y":271},"timestamp":15.22736668586731}]},{"event":"gesture","touches":[{"location":{"x":10,"y":721},"timestamp":17.215118646621704},{"location":{"x":11,"y":721},"timestamp":17.41908097267151},{"location":{"x":27,"y":721},"timestamp":17.442760229110718},{"location":{"x":44,"y":721},"timestamp":17.458979845046997},{"location":{"x":90,"y":721},"timestamp":17.48303747177124},{"location":{"x":120,"y":721},"timestamp":17.499095678329468},{"location":{"x":154,"y":721},"timestamp":17.515274047851562},{"location":{"x":196,"y":718},"timestamp":17.53930401802063},{"location":{"x":228,"y":714},"timestamp":17.562843799591064},{"location":{"x":249,"y":709},"timestamp":17.579257249832153},{"location":{"x":282,"y":704},"timestamp":17.603328466415405},{"location":{"x":315,"y":700},"timestamp":17.626946687698364},{"location":{"x":329,"y":696},"timestamp":17.64309048652649},{"location":{"x":337,"y":696},"timestamp":17.659098386764526},{"location":{"x":347,"y":693},"timestamp":17.684406518936157},{"location":{"x":358,"y":691},"timestamp":17.70815420150757},{"location":{"x":365,"y":689},"timestamp":17.724785566329956},{"location":{"x":376,"y":687},"timestamp":17.74161171913147},{"location":{"x":394,"y":685},"timestamp":17.763437032699585},{"location":{"x":423,"y":683},"timestamp":17.787163019180298},{"location":{"x":444,"y":681},"timestamp":17.80326199531555},{"location":{"x":464,"y":679},"timestamp":17.81929659843445},{"location":{"x":485,"y":676},"timestamp":17.835862398147583},{"location":{"x":510,"y":674},"timestamp":17.85900378227234},{"location":{"x":520,"y":673},"timestamp":17.87552809715271},{"location":{"x":533,"y":669},"timestamp":17.898988008499146},{"location":{"x":539,"y":668},"timestamp":17.91507315635681},{"location":{"x":544,"y":665},"timestamp":17.939560651779175},{"location":{"x":546,"y":662},"timestamp":17.967275142669678}]},{"event":"gesture","touches":[{"location":{"x":541,"y":447},"timestamp":18.441287517547607},{"location":{"x":541,"y":447},"timestamp":18.542145013809204}]},{"event":"end"}]'
    let videoPath = '/Users/mario/Library/Application Support/Sivire/recordings/Simulator Recording - iPhone 11 - 04-23-2020 at 12.36.32.mov'
    openVideoPreviewWindow(videoPath, JSON.parse(timeline))
}
