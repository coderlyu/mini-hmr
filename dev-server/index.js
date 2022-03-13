const webpack = require('webpack')
const config = require('../webpack.config')
const Server = require('./server/Server')
const compiler = webpack(config)
const server = new Server(compiler)
server.listen(3000, 'localhost', () => {
    console.log('server is running at http://localhost:3000')
})