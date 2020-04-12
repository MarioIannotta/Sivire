const { systemPreferences } = require('electron').remote
const Settings = require('./settings')

var html = document.getElementsByTagName('html')[0]
html.style.cssText = [
    `--accent-color: #${systemPreferences.getAccentColor()}`,
    `--background-color: ${systemPreferences.getColor('window-background')}`,
    `--text-color: ${systemPreferences.getColor('control-text')}`].join(';')

let settings = new Settings()
let storedSettings = settings.loadSettings()

let selectedMaskElement
if (storedSettings.mask == 'black') {
    selectedMaskElement = document.getElementById('mask-black')
} else {
    selectedMaskElement = document.getElementById('mask-off')
}

let selectedCodecElement
if (storedSettings.codec == 'h264') {
    selectedCodecElement = document.getElementById('codec-h264')
} else {
    selectedCodecElement = document.getElementById('codec-hvec')
}

selectedMaskElement.setAttribute('checked', true)
selectedCodecElement.setAttribute('checked', true)

function setOffMask() { settings.setOffMask() }

function setBlackMask() { settings.setBlackMask() }

function setHVECCodec() { settings.setHEVCCodec() }

function setH264Codec() { settings.setH264Codec() }