const ffmpeg = require('fluent-ffmpeg'),
    ffmpegPath = require('ffmpeg-static'),
    ffprobePath = require('ffprobe-static').path
const { thumbnailsPath } = require('./file-manager')

ffmpeg.setFfmpegPath(ffmpegPath)
ffmpeg.setFfprobePath(ffprobePath)

module.exports = class PreviewController {

    constructor(videoPath, timeline, indicatorImagePath, indicatorOffset) {
        this.videoPath = videoPath
        this.timeline = timeline
        this.indicatorImagePath = indicatorImagePath
        this.indicatorOffset = indicatorOffset
        this.stream = null
        this.thumbnailsPath = thumbnailsPath
        this.startTime = 0.2 // looks like there's an offset of 0.2 seconds
    }

    async convertToMP4(onProgress) {
        return new Promise((resolve, reject) => {
            let newPath = this.videoPath.replace('.mov', '.mp4')
            ffmpeg(this.videoPath)
                .format('mp4')
                .output(newPath)
                .on('error', error => {
                    reject(error)
                })
                .on('progress', progress => {
                    onProgress(progress.percent / 100)
                })
                .on('end', _ => {
                    this.videoPath = newPath
                    resolve()
                })
                .run()
        })
    }

    async loadMetadata() {
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

    async addTouches(onProgress) {
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
                        let additionalDuration = touches.length == 2 ? 0.2 : 0
                        touchEnd += additionalDuration
                    }
                    filters.push({
                        filter: "overlay",
                        options: {
                            enable: `between(t,${touchStart},${touchEnd})`,
                            x: touch.location.x + this.indicatorOffset.x,
                            y: touch.location.y + this.indicatorOffset.y
                        },
                        inputs: inputs,
                        outputs: `${index}`
                    })
                })
            })
        let newVideoPath = this.videoPath.replace('.mp4', ' - final.mp4')
        return new Promise((resolve, reject) => {
            if (filters.length > 0) {
                ffmpeg(this.videoPath)
                    .input(`${this.indicatorImagePath}`)
                    .complexFilter(filters, `${index}`)
                    .on('progress', progress => {
                        onProgress(progress.percent / 100)
                    })
                    .on('end', _ => {
                        this.videoPath = newVideoPath
                        console.log("ooooooooook")
                        resolve()
                    })
                    .on('error', error => {
                        reject(error)
                    })
                    .output(newVideoPath)
                    .run()
            } else {
                onProgress(1)
                resolve()
            }
        })
    }
}