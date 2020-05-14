const { ipcRenderer, shell } = require('electron')
const { systemPreferences, dialog } = require('electron').remote
const PreviewController = require('./preview-controller')
const sizeOf = require('image-size')
const fs = require('fs')

class Renderer {

    constructor(htmlElements) {
        this.indicatorImagePath = `${__dirname}/images/DefaultIndicator.png`
        this.indicatorImageSize = { width: 0, height: 0 }
        this.html = htmlElements
        this.renderedVideo = null

        this.setIndicatorImage(this.indicatorImagePath)
        this.setupTapPointPreview()
        this.setupSelectImageButton()
        this.setupGenerateVideoButton()
        this.setupSaveVideoButton()
        this.registerListeners(_ => {
            this.showOriginalVideo()
            this.hideGesturesSectionIfNeeded()
        })
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
        this.html.video.style.width = this.html.video.clientWidth // avoid flickering when changing video source
        this.html.video.src = `${path}?t=${Date.now()}` // avoid cache 
    }

    setupTapPointPreview() {
        let initialPoint = { x: this.html.indicatorPreview.clientWidth / 2, y: this.html.indicatorPreview.clientHeight / 2 }
        this.setTapPointPosition(initialPoint)
        var isDragEnabled = false
        this.html.indicatorPreview.addEventListener('mouseup', _ => {
            isDragEnabled = false
        })
        this.html.indicatorPreview.addEventListener('mouseout', _ => {
            isDragEnabled = false
        })
        this.html.indicatorPreview.addEventListener('mousedown', _ => {
            isDragEnabled = true
        })
        this.html.indicatorPreview.addEventListener('mousemove', event => {
            if (isDragEnabled) {
                let currentPoint = { x: event.offsetX, y: event.offsetY }
                this.setTapPointPosition(currentPoint)
            }
        })
    }

    setTapPointPosition(point) {
        // the fours are there to take into account the pointer size
        this.html.tapPoint.style.left = point.x - 4
        this.html.tapPoint.style.top = point.y - 4
        let imageRelativeX = (point.x - this.html.indicatorImage.offsetLeft) / this.html.indicatorImage.clientWidth
        let imageRelativeY = (point.y - this.html.indicatorImage.offsetTop) / this.html.indicatorImage.clientHeight
        this.indicatorImagePosition = { x: imageRelativeX, y: imageRelativeY }
        this.html.coordinate.x.value = `${imageRelativeX.toFixed(2)} %`
        this.html.coordinate.y.value = `${imageRelativeY.toFixed(2)} %`
    }

    setupSelectImageButton() {
        this.html.selectIndicatorImage.addEventListener('click', _ => {
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
        this.html.indicatorImage.style = `background-image: url('${this.indicatorImagePath}')`
        sizeOf(`${path}`, (_, dimensions) => {
            this.indicatorImageSize = { width: dimensions.width, height: dimensions.height }
        })
    }

    setupGenerateVideoButton() {
        this.html.generateVideoButton.addEventListener('click', _ => {
            this.onGenerateVideoButtonDidTap()
        })
    }

    setButtonsEnabled(isEnabled) {
        if (isEnabled) {
            this.html.generateVideoButton.removeAttribute("disabled")
            this.html.saveVideoButton.removeAttribute("disabled")
        } else {
            this.html.generateVideoButton.setAttribute("disabled", "disabled")
            this.html.saveVideoButton.setAttribute("disabled", "disabled")
        }
    }

    showCurrentActivity(activityDescription) {
        let hasActivity = activityDescription != null
        this.html.currentActivity.style.display = hasActivity ? 'inherit' : 'none'
        this.html.currentActivity.innerHTML = activityDescription
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
            this.showCurrentActivity(`Gesture added at ${dateAsSting}`)
        }
        this.html.progressIndicator.style.width = `${progressAverage * 100}%`
    }

    getIndicatorOffset() {
        let x = this.indicatorImageSize.width * this.indicatorImagePosition.x
        let y = this.indicatorImageSize.height * this.indicatorImagePosition.y
        return { x: -x.toFixed(2), y: -y.toFixed(2) }
    }

    hideGesturesSectionIfNeeded() {
        let shouldHideGesturesSection = this.timeline.length <= 2 // just start and stop event
        this.html.gesturesSection.style.opacity = shouldHideGesturesSection ? 0.4 : 1
        this.html.gesturesSection.style.pointerEvents = shouldHideGesturesSection ? "none" : "inherit"
        this.html.noGesturesSectionHint.style.display = shouldHideGesturesSection ? "inherit" : "none"
        this.html.generateVideoSection.style.display = shouldHideGesturesSection ? "none" : "inherit"
        if (shouldHideGesturesSection) {
            document.addEventListener('click', function (event) {
                if (event.target.tagName === 'A' && event.target.href.startsWith('http')) {
                    event.preventDefault()
                    shell.openExternal(event.target.href)
                }
            })
        }
    }

    setupSaveVideoButton() {
        this.html.saveVideoButton.addEventListener('click', _ => {
            let videoPath = this.renderedVideo || this.videoPath
            let videoComponents = videoPath.split("/")
            let videoName = videoComponents[videoComponents.length - 1]
            var options = {
                title: "Save file",
                defaultPath: `~/${videoName}`,
                buttonLabel: "Save"
            }

            dialog.showSaveDialog(options)
                .then((result) => {
                    let filePath = result.filePath
                    fs.copyFile(videoPath, filePath, error => {
                        console.log(error)
                    })
                })
        })
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
    generateVideoButton: document.getElementById('generate-video-button'),
    generateVideoSection: document.getElementById('generate-video-section'),
    currentActivity: document.getElementById('current-activity'),
    progressIndicator: document.getElementById('progress-indicator'),
    gesturesSection: document.getElementById('gestures-section'),
    noGesturesSectionHint: document.getElementById('no-gestures-section-hint'),
    saveVideoButton: document.getElementById('save-video-button'),
})

renderer.registerSteps({
    'mp4': 'Converting to mp4...',
    'metadata': 'Loading metadata...',
    'overlays': 'Rendering gestures...'
})

renderer.onGenerateVideoButtonDidTap = _ => {
    addGestures()
}

async function addGestures() {
    renderer.showOriginalVideo()
    let indicatorOffset = renderer.getIndicatorOffset()
    let previewController = new PreviewController(renderer.videoPath, renderer.timeline, renderer.indicatorImagePath, indicatorOffset)
    renderer.setButtonsEnabled(false)
    renderer.resetProgress()
    await previewController.convertToMP4(progress => {
        renderer.setStepProgress("mp4", progress)
    })
    renderer.setStepProgress("mp4", 1)
    await previewController.loadMetadata()
    renderer.setStepProgress("metadata", 1)
    await previewController.addTouches(progress => {
        renderer.setStepProgress("overlays", progress)
    })
    renderer.setStepProgress("overlays", 1)
    renderer.renderedVideo = previewController.videoPath
    renderer.showVideo(previewController.videoPath)
    renderer.setButtonsEnabled(true)
}