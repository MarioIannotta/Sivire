const { ipcRenderer } = require('electron')
const { systemPreferences } = require('electron').remote
const PreviewController = require('./preview-controller')

class Renderer {

    constructor() { }

    videoPathPromise = new Promise(resolve => {
        ipcRenderer.on('video-path', (_, result) => {
            resolve(result)
        })
    })

    timelinePromise = new Promise(resolve => {
        ipcRenderer.on('timeline', (_, result) => {
            resolve(result);
        })
    })

    registerListeners(completion) {
        Promise
            .all([this.videoPathPromise, this.timelinePromise])
            .then(values => {
                let videoPath = values[0]
                let timeline = values[1]
                completion(videoPath, timeline)
            })
    }

    addVideoHtml(path, element) {
        element.innerHTML = `
        <video height="100%" id="video" controls>
            <source src="${path}" type="video/mp4">
        </video>`
    }

    showScreenshots(screenshotsPaths, timelineElement) {
        let images = screenshotsPaths.map(screenshotPath => {
            return `<img src="${screenshotPath}" height="100%" class="screenshot"/>`
        })
        timelineElement.innerHTML = images.join("")
    }
}

function injectSystemColors() {
    var html = document.getElementsByTagName('html')[0]
    html.style.cssText = [
        `--accent-color: #${systemPreferences.getAccentColor()}`,
        `--background-color: ${systemPreferences.getColor('window-background')}`,
        `--text-color: ${systemPreferences.getColor('control-text')}`].join(';')
}

injectSystemColors()

let videoPreviewElement = document.getElementById('video-preview')
let videoElement = document.getElementById('video')
let timelineElement = document.getElementById('timeline')

console.log(videoPreviewElement.clientWidth)

let renderer = new Renderer()

renderer.registerListeners((videoPath, timeline) => {
    renderer.addVideoHtml(videoPath, videoPreviewElement)

    // probably there's a better way to do this...
    let previewController = new PreviewController(videoPath, timeline)
    console.log('1/4 converting to mp4...')
    previewController
        .convertToMP4(progress => {
            console.log(progress)
        })
        .then(_ => {
            console.log('2/4 loading metadata...')
            previewController.loadMetadata()
                .then(_ => {
                    console.log('3/4 adding overlays...')
                    previewController
                        .addTouches(progress => {
                            console.log(progress)
                        })
                        .then(_ => {
                            renderer.addVideoHtml(previewController.videoPath, videoPreviewElement)
                            console.log('4/4 everything rendered...')
                        })
                })
        })
        .catch(error => {
            console.log(error)
        })
})
