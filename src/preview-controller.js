const ffmpeg = require('fluent-ffmpeg')
const { thumbnailsPath } = require('./file-manager')

module.exports = class PreviewController {

    constructor(videoPath, timeline, completion) {
        this.videoPath = videoPath
        this.timeline = timeline
        this.stream = null
        this.thumbnailsPath = thumbnailsPath
        this.startTime = 0
        this.loadMetadata()
            .then(_ => {
                // looks like there's a delay of about 0.17 between the touch and the real action
                this.startTime = this.stream.start_time + 0.17 
                completion(this)
            })
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
        let touches = this.timeline.reduce((touches, event) => {
            if (event.touches) {
                touches.push(...event.touches)
            }
            return touches
        }, [])
        var index = -1
        let filters = touches.map(event => {
            let eventStart = event.timestamp - this.startTime
            let eventDuration = 0.2
            let inputs = ''
            if (index == -1) {
                inputs = '[0:v]'
            } else {
                inputs = `[${index}][1:v]`
            }
            index++
            return {
                filter: "overlay",
                options: {
                    enable: `between(t,${eventStart},${eventStart + eventDuration})`,
                    x: event.location.x,
                    y: event.location.y
                },
                inputs: inputs,
                outputs: `${index}`
            }
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