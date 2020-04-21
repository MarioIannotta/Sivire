const { dialog, BrowserWindow } = require('electron')
const { showLogs } = require('./logger')
const XCRunController = require('./xcrun-controller')
const Settings = require('./settings')

module.exports = class SimulatorsController {

    constructor(onListUpdate) {
        this.runtimes = []
        this.isLoading = true
        this.onListUpdate = onListUpdate
        this.recordingSimulatorUDID = null
        this.fileName = null
        this.xcrunController = new XCRunController()
        this.timer = setInterval(_ => {
            this.xcrunController.fetchSimulators((error, runtimes) => {
                this.isLoading = false
                this.runtimes = runtimes
                if (this.recordingSimulatorUDID != null && this.recordingSimulator() == null) {
                    this.stopRecording()
                } else {
                    this.onListUpdate(this)
                }
            })
        }, 1000)
    }

    recordingSimulator() {
        var foundSimulator = null
        this.runtimes.forEach(runtime => {
            runtime.simulators.forEach(simulator => {
                if (simulator.udid === this.recordingSimulatorUDID) {
                    foundSimulator = simulator
                }
            })
        })
        return foundSimulator
    }

    startRecording(simulatorUDID) {
        this.recordingSimulatorUDID = simulatorUDID
        let settings = (new Settings()).loadSettings()
        this.fileName = this.xcrunController.startRecording(this.recordingSimulator(), settings.mask, settings.codec, (error) => {
            if (error) {
                showErrorDialog()
            }
        })
        this.onListUpdate(this)
    }

    stopRecording() {
        this.xcrunController.stopRecording(error => {
            if (error) {
                showErrorDialog()
            }
        })
        this.recordingSimulatorUDID = null
        this.onListUpdate(this)
        return this.fileName
    }
}

var showErrorDialog = function () {
    let window = BrowserWindow.getFocusedWindow()
    let options = {
        type: 'error',
        title: 'Error',
        buttons: ['Open logs', 'Cancel'],
        message: 'An error occurred, check the log for more information.'
    }
    dialog
        .showMessageBox(window, options, choice => {
            if (choice == 0) {
                showLogs()
            }
        })

}