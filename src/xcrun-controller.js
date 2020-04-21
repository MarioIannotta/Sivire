const { spawn } = require('child_process')
const { diagnosticLog } = require('./logger')
const { recordingsPath } = require('./file-manager')

module.exports = class XCRunController {

    constructor() {
        this.recordProcessID = null
        this.basePath = recordingsPath
    }

    fetchSimulators(completion) {
        let fetchSimulatorsProcess = spawn('xcrun', ['simctl', 'list', '-j'])

        var result = ''
        fetchSimulatorsProcess.stdout.on('data', data => {
            result += data
        })

        fetchSimulatorsProcess.stderr.on('data', data => {
            diagnosticLog(`Fetch simulators stderr: ${data}`)
        })

        fetchSimulatorsProcess.on('error', error => {
            diagnosticLog(`Fetch simulators error: ${error}`)
        })

        fetchSimulatorsProcess.on('close', code => {
            if (code === 0) {
                this.fetchBootedSimulators(result, completion)
            } else {
                completion({ exitCode: code }, [])
            }
        })
    }

    fetchBootedSimulators(simCtlListResult, completion) {
        let object = JSON.parse(simCtlListResult)
        let devices = object.devices

        let runtimes = Object.keys(devices)
            .map((runtime) => {
                let simulators = devices[runtime]
                    .map(simulator => ({
                        name: simulator.name,
                        udid: simulator.udid,
                        state: simulator.state
                    }))
                    .filter(simulator => simulator.state == 'Booted')
                if (simulators.length > 0) {
                    let runtimeComponents = runtime.split('.')
                    let runtimeName = runtimeComponents[runtimeComponents.length - 1]
                        .replace('-', ' ')
                        .replace(/-/g, '.')
                    return {
                        name: runtimeName,
                        simulators: simulators
                    }
                } else {
                    return null
                }
            })
            .filter(runtime => runtime != null)
        completion(null, runtimes)
    }

    startRecording(simulator, mask = 'ignored', codec = 'hevc', completion) {
        diagnosticLog(`Start recording ${simulator.name} - ${simulator.udid}`)
        let fileName = recordingFileName(this.basePath, simulator.name)
        var parameters = ['simctl', 'io', simulator.udid, 'recordVideo', `--mask=${mask}`, `--codec=${codec}`, '--force', fileName]
        let recordVideoProcess = spawn('xcrun', parameters)
        this.recordProcessID = recordVideoProcess.pid

        var result = ''
        recordVideoProcess.stdout.on('data', data => {
            result += data
        })

        recordVideoProcess.stderr.on('data', data => {
            diagnosticLog(`Recording stderr: ${data}`)
        })

        recordVideoProcess.on('error', error => {
            diagnosticLog(`Recording error: ${data}`)
        })

        recordVideoProcess.on('close', code => {
            diagnosticLog(`Recording ended with exit code ${code}`)
            if (code === 0) {
                completion(null)
            } else {
                completion({ exitCode: code })
            }
        })
        return fileName
    }

    stopRecording(completion) {
        if (this.recordProcessID) {
            diagnosticLog(`Stop recording...`)
            let stopRecordingProcess = spawn('kill', ['-INT', this.recordProcessID])
            var result = ''
            stopRecordingProcess.stdout.on('data', data => {
                result += data
            })

            stopRecordingProcess.stderr.on('data', data => {
                diagnosticLog(`Stop recording stderr: ${data}`)
            })

            stopRecordingProcess.on('error', error => {
                diagnosticLog(`Stop recording error: ${data}`)
            })

            stopRecordingProcess.on('close', code => {
                diagnosticLog(`Stop recording ended with exit code ${code}`)
                if (code === 0) {
                    completion(null)
                } else {
                    completion({ exitCode: code })
                }
            })
        } else {
            diagnosticLog(`Unable to stop recording. Process id not found.`)
        }
    }
}

var recordingFileName = function (basePath, name) {
    let date = new Date()
    let dateAsSting = new Intl.DateTimeFormat('en-US',
        {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        })
        .format(date)
        .replace(/:/g, '.')
        .replace(/\//g, '-')
        .replace(', ', ' at ')
    return `${basePath}/Simulator Recording - ${name} - ${dateAsSting}.mov`
}