const express = require('express')
const bodyParser = require('body-parser')

class GesturesServer {

  constructor(port) {
    this.app = express()
    this.app.use(bodyParser.urlencoded({ extended: true }))
    this.app.use(bodyParser.json())
    this.app.disable('x-powered-by') // remove X-Powered-By header
    this.app.listen(port)
    this.timeline = []
    this.referenceTime = null
    this.registerApis()
  }

  registerApis() {
    const router = express.Router()
    this.registerStartRecordingApi(router)
    this.registerEndRecordingApi(router)
    this.registerPostGestureApi(router)
    this.app.use(router)
  }

  registerStartRecordingApi(router) {
    router.post('/start-recording', (_, response) => {
      if (this.timeline.length > 0) {
        this.setErrorResponse(response, 'A recording is already started. Call POST /end-recording to end it.')
        return
      }
      this.startRecording()
      this.setSuccessResponse(response, event)
    })
  }

  registerEndRecordingApi(router) {
    router.post('/end-recording', (_, response) => {
      if (this.timeline.length == 0) {
        this.setNoRecordingErrorResponse(response)
        return
      }
      let timeline = this.stopRecording()
      this.setSuccessResponse(response, timeline)
    })
  }

  registerPostGestureApi(router) {
    router.post('/gesture', (request, response) => {
      if (this.timeline.length == 0) {
        this.setNoRecordingErrorResponse(response)
        return
      }
      let touches = request.body.touches
      if (!touches) {
        this.setErrorResponse(response, "Invalid input")
        return
      }
      let adjustedTouches = touches.map((touch) => ({
        location: touch.location,
        timestamp: touch.timestamp - this.referenceTime
      }))
      let event = {
        event: 'gesture',
        touches: adjustedTouches
      }
      this.timeline.push(event)
      this.setSuccessResponse(response, event)
    })
  }

  setSuccessResponse(response, result) {
    response.json({
      error: { code: '0', message: '' },
      result: result
    })
  }

  setErrorResponse(response, message, code) {
    response.status(500)
    response.json({
      error: { code: code || '1', message: message }
    })
  }

  setNoRecordingErrorResponse(response) {
    this.setErrorResponse(response, 'Sivire is not recording your actions. Start a new recording from your Mac menu bar if you wish to record them.', 2)
  }

  startRecording() {
    this.referenceTime = (new Date()).getTime()/1000
    let event = { event: 'start', timestamp: this.referenceTime }
    this.timeline.push(event)
  }

  stopRecording() {
    let event = { event: 'end' }
    this.timeline.push(event)
    let timelineToReturn = this.timeline
    this.timeline = []
    this.referenceTime = null
    return timelineToReturn
  }

}

const spawnServer = function (port) {
  const server = new GesturesServer(port)
  return server
}

const startRecording = function (server) {
  server.startRecording()
}

const stopRecording = function (server) {
  return server.stopRecording()
}

module.exports = {
  spawnServer: spawnServer,
  startRecordingGestures: startRecording,
  stopRecordingGestures: stopRecording
}