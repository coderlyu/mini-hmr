const socket = require('socket.io-client')
class EventEmitter {
    
    constructor() {
        this.events = {}
    }
    on(eventName, fn) {
        this.events[eventName] = fn
    }
    emit(eventName, ...args) {
        this.events[eventName](...args)
    }
}
let hotEmitter = new EventEmitter()
// 客户端记录当前的hash
let currentHash
socket.on('hash', (hash) => {
    console.log('hash', hash)
})

socket.on('ok', (ok) => {
    console.log('ok', ok)
})

function reloadApp() {
    hotEmitter.emit('webpackHotUpdate')
}