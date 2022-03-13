// 往 webpack.config.js 里面注入 热更新的代码
// entry: {
//     main: [
//          'webpack-dev-server/client/index.js', // webpack-dev-server
//          'webpack/hot/dev-server', // webpack源码
//          './src/index.js'
//  ]
// },
const path = require('path')
module.exports = function updateCompiler(compiler) {
    const config = compiler.options
    config.entry = {
        main: [
            // /Users/liuyu/Desktop/mine/mini-hmr/ebpack/hot/dev-server.js
            // /Users/liuyu/Desktop/mine/mini-hmr/dev-server/client/index.js
            path.resolve(__dirname, './client/index.js'),
            path.resolve(__dirname, '../webpack/hot/dev-server.js'),
            config.entry
        ]
    }
    console.log(config.entry)
}