const Store = require('electron-store')

module.exports = class Settings {
    
    constructor() {
        this.store = new Store()
        this.keys = {
            mask: "mask",
            codec: "codec"
        }
        this.initSettingsIfNeeded()
    }

    initSettingsIfNeeded() {
        let settings = this.loadSettings()
        if (!settings.mask) {
            this.setOffMask()
        }
        if (!settings.codec) {
            this.setHEVCCodec()
        }
    }

    loadSettings() {
        return {
            mask: this.store.get(this.keys.mask),
            codec: this.store.get(this.keys.codec)
        }
    }

    setBlackMask() {
        this.store.set(this.keys.mask, "black")
    }

    setOffMask() {
        this.store.set(this.keys.mask, "ignored")
    }

    setH264Codec() {
        this.store.set(this.keys.codec, "h264")
    }

    setHEVCCodec() {
        this.store.set(this.keys.codec, "hevc")
    }
}