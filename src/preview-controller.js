const ffmpeg = require('fluent-ffmpeg'),
    ffmpegPath = require('ffmpeg-static'),
    ffprobePath = require('ffprobe-static').path
const { thumbnailsPath } = require('./file-manager')

ffmpeg.setFfmpegPath(ffmpegPath)
ffmpeg.setFfprobePath(ffprobePath)

module.exports = class PreviewController {

    constructor(videoPath, timeline) {
        this.videoPath = videoPath
        this.timeline = timeline
        this.stream = null
        this.thumbnailsPath = thumbnailsPath
        this.startTime = 0.3 // looks like there's an offset of 0.3 seconds
    }

    convertToMP4(onProgress) {
        return new Promise((resolve, reject) => {
            let newPath = this.videoPath.replace('.mov', '.mp4')
            ffmpeg(this.videoPath)
                .format('mp4')
                .output(newPath)
                .on('error', error => {
                    reject(error)
                })
                .on('progress', progress => {
                    onProgress(progress.percent)
                })
                .on('end', _ => {
                    this.videoPath = newPath
                    resolve()
                })
                .run()
        })
    }

    loadMetadata() {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(this.videoPath, (error, metadata) => {
                if (error) {
                    reject(error)
                } else {
                    this.stream = metadata.streams[0]
                    resolve()
                }
            })
        })
    }

    addTouches(onProgress) {
        var filters = []
        let eventDuration = 0.2
        var index = -1
        this.timeline
            .filter(event => event.event === "gesture")
            .forEach(event => {
                let touches = event.touches || []
                touches.forEach((touch, touchIndex) => {
                    let inputs = ''
                    if (index == -1) {
                        inputs = '[0:v]'
                    } else {
                        inputs = `[${index}][1:v]`
                    }
                    index++
                    let touchStart = touch.timestamp - this.startTime
                    var touchEnd = touchStart - this.startTime + eventDuration
                    let nextEvent = touches[touchIndex + 1]
                    if (nextEvent) {
                        touchEnd = nextEvent.timestamp - this.startTime
                    } else if (touches.length == 2) { 
                        // touches.length == 2 --> simple taps: let's increase the event duration so it is a little bit more visible
                        let additionalDuration = touches.length == 2 ? 0.3 : 0
                        touchEnd += additionalDuration
                    }
                    filters.push({
                        filter: "overlay",
                        options: {
                            enable: `between(t,${roundDown(touchStart)},${roundUp(touchEnd)})`,
                            x: touch.location.x,
                            y: touch.location.y
                        },
                        inputs: inputs,
                        outputs: `${index}`
                    })
                })
            })
        let newVideoPath = this.videoPath.replace('.mp4', ' - final.mp4')
        return new Promise((resolve, reject) => {
            ffmpeg(this.videoPath)
                .input(`${__dirname}/images/Indicator.png`)
                .complexFilter(filters, `${index}`)
                .on('progress', progress => {
                    onProgress(progress.percent)
                })
                .on('end', _ => {
                    this.videoPath = newVideoPath
                    resolve()
                })
                .on('error', error => {
                    reject(error)
                })
                .output(newVideoPath)
                .run()
        })
    }

    makeTimelineScreenshots(availableWidth, availableHeight) {
        let ratio = this.stream.width / this.stream.height
        let scale = 3
        let screenshotHeight = Math.round(availableHeight)
        let screenshotWidth = Math.round(availableHeight * ratio)
        let numberOfScreenshots = Math.ceil(availableWidth / screenshotWidth)
        var filenames = []
        return new Promise(resolve => {
            ffmpeg(this.videoPath)
                .screenshots({
                    count: numberOfScreenshots,
                    filename: 'thumbnail-at-%s-seconds.png',
                    folder: this.thumbnailsPath,
                    size: `${screenshotWidth * scale}x${screenshotHeight * scale}`
                })
                .on('error', error => {
                    reject(error)
                })
                .on('filenames', _filenames => {
                    filenames = _filenames
                })
                .on('end', _ => {
                    let screenshotPaths = filenames.map(filename => {
                        return `${this.thumbnailsPath}/${filename}`
                    })
                    resolve(screenshotPaths)
                })
        })
    }
}

function roundDown(value) {
    return Math.floor(value * 100) / 100
}
function roundUp(value) {
    return Math.ceil(value * 100) / 100
}