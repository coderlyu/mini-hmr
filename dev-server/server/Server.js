const http = require('http')
const express = require('express')
const updateCompiler = require('../updateCompiler')
// const MemoryFs = require('memory-fs') // 内存文件系统
const fs = require('fs-extra')
const path = require('path')
const mime = require('mime')
const socketIo = require('socket.io')
fs.join = path.join
module.exports = class Server {
    constructor(compiler) {
        this.compiler = compiler
        this.currentHash = '' // 当前的 hash 值，每次编译都会产生新的 hash 值
        this.clientSocketList = [] // 存放所有通过 websocket 连接到服务器的客户端
        updateCompiler(compiler) // 注入代码
        this.setupApp()
        this.setupHooks()
        this.setupDevMiddleware()
        this.routes() // 配置路由
        this.createServer()
        this.createSocketServer() // 创建 socket server
    }
    createSocketServer() {
        // websocket 协议握手需要http服务器
        const io = this.io = socketIo(this.server)
        // 服务器要监听客户端的连接，当客户端连接上来后，socket代表跟这个客户端连接对象
        io.on('connection', (socket) => {
            console.log('客户端连接上来了')
            this.clientSocketList.push(socket)
            socket.emit('hash', this.currentHash) // 把最新的hash值发送给客户端
            socket.emit('ok') // 给客户端发送ok
            socket.on('disconnect', () => {
                let idx = this.clientSocketList.indexOf(socket)
                this.clientSocketList.splice(idx, 1)
            })
        })
    }
    routes() {
        const { compiler } = this
        let config = compiler.options
        this.app.use(this.middleware(config.output.path))
    }
    setupDevMiddleware() {
        this.middleware = this.webpackDevMiddleware()
    }
    webpackDevMiddleware() {
        // 已监听模式启动编译
        this.compiler.watch({}, () => {
            console.log('监听模式编译成功')
        })
        // const fs = new MemoryFs()
        // 以后打包后的文件写入内存文件系统中，读的时候也是从内存文件系统中读取
        this.fs = this.compiler.outputFileSystem = fs

        // 返回一个中间件，用来响应客户端对于产出文件的请求：index.html、.json、.js
        return (staticDir) => { // 静态文件根目录，它其实就是输出目录 dist 目录
            return (req, res, next) =>  {
                let { url } = req
                if (url === '/favicon.ico') return res.sendStatus(404)
                url === '/' ? url = '/index.html' : null
                let filePath = path.join(staticDir, url) // 得到要访问的静态路径
                console.log('filePath', filePath)
                try {
                    // 返回此路径上的文件的描述对象，如果此文件不存在，会抛出异常
                    let statObj = this.fs.statSync(filePath)
                    // console.log(statObj)
                    if (statObj.isFile()) {
                        let content = this.fs.readFileSync(filePath)
                        res.setHeader('Content-Type', mime.getType(filePath))
                        res.send(content)
                    } else {
                        console.log('fshdof')
                        return res.sendStatus(404)
                    }
                } catch (error) {
                    console.log(error)
                    return res.sendStatus(404)
                }
            }
        }
    }
    setupHooks() {
        this.compiler.hooks.done.tap('webpack-dev-server-mini', (stats) => {
            // stats 对象存放着打包后的结果，hash、chunkhash、contenthash 产生了哪些代码块、产出了哪些模块
            console.log('hash', stats.hash)
            this.currentHash = stats.hash
            this.clientSocketList.forEach((socket) => {
                // 向所有的客户端进行广播，新的代码块代码编译完成了，请求拉取最新的代码
                socket.emit('hash', this.currentHash) // 把最新的hash值发送给客户端
                socket.emit('ok') // 给客户端发送ok
            })
        })
    }
    setupApp() {
        this.app = express()
    }
    createServer() {
        this.server = http.createServer(this.app) // 这样做可以获取到 app 实例
    }
    listen(port, host, callback) {
        this.server.listen(port, host, callback)
    }
}