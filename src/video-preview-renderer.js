const { ipcRenderer } = require('electron')
const { systemPreferences, dialog } = require('electron').remote
const PreviewController = require('./preview-controller')
const sizeOf = require('image-size')

class Renderer {

    constructor(htmlElements) {
        this.indicatorImagePath = `${__dirname}/images/DefaultIndicator.png`
        this.indicatorImageSize = { width: 0, height: 0 }
        this.videoElement = htmlElements.video
        this.indicatorPreviewElement = htmlElements.indicatorPreview
        this.indicatorImageElement = htmlElements.indicatorImage
        this.tapPointElement = htmlElements.tapPoint
        this.xCoordinateElement = htmlElements.coordinate.x
        this.yCoordinateElement = htmlElements.coordinate.y
        this.selectIndicatorImageElement = htmlElements.selectIndicatorImage
        this.generateVideoElement = htmlElements.generateVideo
        this.currentActivityElement = htmlElements.currentActivity
        this.progressIndicatorElement = htmlElements.progressIndicator

        this.setIndicatorImage(this.indicatorImagePath)
        this.setupTapPointPreview()
        this.setupSelectImageButton()
        this.setupGenerateVideoButton()
        this.registerListeners(_ => { this.showOriginalVideo() })
    }

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
                this.videoPath = values[0]
                this.timeline = values[1]
                completion()
            })
    }

    showOriginalVideo() {
        this.showVideo(this.videoPath)
    }

    showVideo(path) {
        this.videoElement.style.width = this.videoElement.clientWidth // avoid flickering when changing video source
        this.videoElement.src = `${path}?t=${Date.now()}` // avoid cache 
    }

    setupTapPointPreview() {
        let initialPoint = { x: this.indicatorPreviewElement.clientWidth / 2, y: this.indicatorPreviewElement.clientHeight / 2 }
        this.setTapPointPosition(initialPoint)
        var isDragEnabled = false
        this.indicatorPreviewElement.addEventListener('mouseup', _ => {
            isDragEnabled = false
        })
        this.indicatorPreviewElement.addEventListener('mouseout', _ => {
            isDragEnabled = false
        })
        this.indicatorPreviewElement.addEventListener('mousedown', _ => {
            isDragEnabled = true
        })
        this.indicatorPreviewElement.addEventListener('mousemove', event => {
            if (isDragEnabled) {
                let currentPoint = { x: event.offsetX, y: event.offsetY }
                this.setTapPointPosition(currentPoint)
            }
        })
    }

    setTapPointPosition(point) {
        // the fours are there to take into account the pointer size
        this.tapPointElement.style.left = point.x - 4
        this.tapPointElement.style.top = point.y - 4
        let imageRelativeX = (point.x - this.indicatorImageElement.offsetLeft) / this.indicatorImageElement.clientWidth
        let imageRelativeY = (point.y - this.indicatorImageElement.offsetTop) / this.indicatorImageElement.clientHeight
        this.indicatorImagePosition = { x: imageRelativeX, y: imageRelativeY }
        this.xCoordinateElement.value = `${imageRelativeX.toFixed(2)} %`
        this.yCoordinateElement.value = `${imageRelativeY.toFixed(2)} %`
    }

    setupSelectImageButton() {
        this.selectIndicatorImageElement.addEventListener('click', _ => {
            let fileExplorerOptions = {
                properties: ['openFile'],
                filters: [
                    { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }
                ]
            }
            dialog.showOpenDialog(fileExplorerOptions)
                .then(result => {
                    let filePath = result.filePaths[0]
                    this.setIndicatorImage(filePath)
                })
        })
    }

    setIndicatorImage(path) {
        this.indicatorImagePath = path
        this.indicatorImageElement.style = `background-image: url('${this.indicatorImagePath}')`
        sizeOf(`${path}`, (_, dimensions) => {
            this.indicatorImageSize = { width: dimensions.width, height: dimensions.height }
        })
    }

    setupGenerateVideoButton() {
        this.generateVideoElement.addEventListener('click', _ => {
            this.onGenerateVideoButtonDidTap()
        })
    }

    setGenerateVideoButtonEnabled(isEnabled) {
        if (isEnabled) {
            this.generateVideoElement.removeAttribute("disabled")
        } else {
            this.generateVideoElement.setAttribute("disabled", "disabled")
        }
    }

    showCurrentActivity(activityDescription) {
        let hasActivity = activityDescription != null
        this.currentActivityElement.style.display = hasActivity ? 'inline' : 'none'
        this.currentActivityElement.innerHTML = activityDescription
    }

    registerSteps(steps) {
        this.steps = steps
        this.progressesForSteps = []
    }

    resetProgress() {
        Object.keys(this.steps).forEach(step => {
            this.progressesForSteps[step] = 0
        })
    }

    setStepProgress(stepName, progress) {
        this.showCurrentActivity(this.steps[stepName])
        this.progressesForSteps[stepName] = progress
        let totalProgress = Object.values(this.progressesForSteps).reduce((sum, progress) => { return sum + progress }, 0)
        let progressAverage = totalProgress / Object.keys(this.steps).length
        if (progressAverage == 1) {
            let date = new Date()
            let dateAsSting = new Intl.DateTimeFormat('en-US',
                {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                })
                .format(date)
                .replace(/:/g, '.')
                .replace(/\//g, '-')
                .replace(', ', ' at ')
            this.showCurrentActivity(`Video generated at ${dateAsSting}`)
        }
        this.progressIndicatorElement.style.width = `${progressAverage * 100}%`
    }

    getIndicatorOffset() {
        let x = this.indicatorImageSize.width * this.indicatorImagePosition.x
        let y = this.indicatorImageSize.height * this.indicatorImagePosition.y
        return { x: -x.toFixed(2), y: -y.toFixed(2) }
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

let renderer = new Renderer({
    video: document.getElementById('video'),
    indicatorPreview: document.getElementById('gesture-indicator-preview'),
    indicatorImage: document.getElementById('gesture-indicator-image'),
    tapPoint: document.getElementById('gesture-indicator-tap-point'),
    coordinate: {
        x: document.getElementById('x-coordinate'),
        y: document.getElementById('y-coordinate')
    },
    selectIndicatorImage: document.getElementById('gesture-indicator-image-select-button'),
    generateVideo: document.getElementById('generate-video-button'),
    currentActivity: document.getElementById('current-activity'),
    progressIndicator: document.getElementById('progress-indicator')
})

renderer.registerSteps({
    'mp4': 'Converting to mp4...',
    'metadata': 'Loading metadata...',
    'overlays': 'Rendering gestures...'
})

renderer.onGenerateVideoButtonDidTap = _ => {
    renderer.showOriginalVideo()
    let indicatorOffset = renderer.getIndicatorOffset()
    let previewController = new PreviewController(renderer.videoPath, renderer.timeline, renderer.indicatorImagePath, indicatorOffset)
    renderer.setGenerateVideoButtonEnabled(false)
    renderer.resetProgress()
    previewController
        .convertToMP4(progress => {
            renderer.setStepProgress("mp4", progress)
        })
        .then(_ => {
            renderer.setStepProgress("mp4", 1)
            previewController.loadMetadata()
                .then(_ => {
                    renderer.setStepProgress("metadata", 1)
                    previewController
                        .addTouches(progress => {
                            renderer.setStepProgress("overlays", progress)
                        })
                        .then(_ => {
                            renderer.setStepProgress("overlays", 1)
                            renderer.showVideo(previewController.videoPath)
                            renderer.setGenerateVideoButtonEnabled(true)
                        })
                })
        })
        .catch(error => {
            renderer.setGenerateVideoButtonEnabled(true)
            console.log(error)
        })
}
