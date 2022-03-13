// 客户端记录当前的hash
let currentHash;
let lastHash;
// 为什么需要两个hash值
/** currentHash = lastHash = hash1
 * 客户端里的代码和服务器是一致的，都是 hash1
 * 这个时候服务器重新编译了
 * 1. 重新得到一个新的 hash 值，hash2
 * 2. 还会创建一个 hash1 的补丁包，包里会说明 hash1 到 hash2 哪些代码块发送了变更，以及发生了哪些变量已变
 *
 */
class EventEmitter {
  constructor() {
    this.events = {};
  }
  on(eventName, fn) {
    this.events[eventName] = fn;
  }
  emit(eventName, ...args) {
    this.events[eventName](...args);
  }
}
let hotEmitter = new EventEmitter();
(function (modules) {
  let installedModules = {};
  //
  function hotCheck() {
    hotDownloadManifest()
      .then((update) => {
        let chunkIds = Object.keys(update.c);
        chunkIds.forEach((chunkId) => {
          hotDownloadUpdateChunk(chunkId);
        });
        lastHash = currentHash;
      })
      .catch(() => window.location.reload());
  }

  //
  function hotDownloadUpdateChunk() {
    let script = document.createElement("script");
    script.src = `${chunkId}.${lastHash}.hot-update.js`;
    document.body.appendChild(script);
  }

  //
  window.webpackHotUpdate = function (chunkId, moreModules) {
    hotAddUpdateChunk(chunkId, moreModules);
  };

  //
  let hotUpdate = {};
  function hotAddUpdateChunk(chunkId, moreModules) {
    for (let moduleId in moreModules) {
      modules[moduleId] = hotUpdate[moduleId] = moreModules[moduleId];
    }
    hotApply();
  }

  //
  function hotApply() {
    for (let moduleId in hotUpdate) {
      let oldModule = installedModules[moduleId]; // 取出老模块
      delete installedModules[moduleId]; // 把老模块从缓存中删掉
      oldModule.parents.forEach((parentModule) => {
        // 循环所有的父模块，取出回调并执行
        let cb = parentModule.hot._accpetedDependencies[moduleId];
        cb && cb();
      });
    }
  }

  //
  function hotDownloadManifest() {
    return new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();
      let url = `${lastHash}.hot-update.json`;
      xhr.open("get", url);
      xhr.responseType = "json";
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.send();
    });
  }

  //
  function hotCreateModule() {
    let hot = {
      _accpetedDependencies: {},
      accept: function (deps, callback) {
        // hot._accpetedDependencies['./title.js'] = render
        deps.forEach((dep) => (hot._accpetedDependencies[dep] = callback));
      },
      check: hotCheck,
    };
    return hot;
  }
  // parentModuleId 父模块id
  function hotCreateRequire(parentModuleId) {
    // 因为要加载子模块的时候，父模块肯定加载过了，可以从缓存中通过父模块的id拿到父模块对象
    let parentModule = installedModules[parentModuleId];
    // 如果没有父模块，表示这个顶级模块
    if (!parentModule) return __webpack_require__;
    let hotRequire = function (childModuleId) {
      parentModule.children.push(childModuleId); // 把此模块加入到父模块里面
      __webpack_require__(childModuleId); // 如果require过，会把子模块放到缓存中
      let childModule = installedModules[childModuleId];
      childModule.parents.push(parentModule);
      console.log(childModule);
      return childModule.exports; // 返回子模块的导出对象
    };
    return hotRequire;
  }
  function __webpack_require__(moduleId) {
    if (installedModules[moduleId]) {
      return installedModules[moduleId];
    }
    // 创建模块对象，放入缓存中
    let module = (installedModules[moduleId] = {
      i: moduleId, // 模块id，也就是标识符
      l: false, // loaded是否已经加载
      hot: hotCreateModule(),
      exports: {}, // 导出对象
      parents: [], // 当前模块的父亲们
      children: [], // 当前模块的儿子们
    });
    // 执行模块代码，给modules.exports 赋值
    modules[moduleId].call(
      module.exports,
      module,
      module.exports,
      hotCreateRequire(moduleId)
    );
    module.l = true; // 表示已经加载过模块了
    return module.exports;
  }
  __webpack_require__.c = installedModules;
  return __webpack_require__("./src/index.js");
})({
  "./src/index.js": function (module, exports, __webpack_require__) {
    // 监听 webpackHotUpdate 事件
    __webpack_require__("webpack/hot/dev-server.js");
    // 连接websocket服务器，如果服务器发送给我hash，我就保存到currentHash
    // 如果服务器发送ok，我就发射 webpackHotUpdate 事件
    __webpack_require__("webpack-dev-server/client/index.js");
    const input = document.createElement("input");
    const p = document.createElement("p");
    document.body.appendChild(input);
    document.body.appendChild(p);
    const render = function () {
      let title = __webpack_require__("./src/title.js");
      p.innerHTML = title;
    };
    render();
    if (module.hot) {
      module.hot.accept(["./src/title.js"], render);
    }
  },
  "./src/title.js": function (module, exports, __webpack_require__) {
    module.exports = "我是title，你好啊";
  },
  "webpack-dev-server/client/index.js": function (
    module,
    exports,
    __webpack_require__
  ) {
    // const io = require("socket.io-client");
    const socket = window.io("/");

    socket.on("hash", (hash) => {
      currentHash = hash;
      console.log("hash", hash);
    });

    socket.on("ok", (ok) => {
      console.log("ok", ok);
      reloadApp();
    });

    function reloadApp() {
      hotEmitter.emit("webpackHotUpdate");
    }
  },
  "webpack/hot/dev-server.js": function (module, exports, __webpack_require__) {
    hotEmitter.on("webpackHotUpdate", () => {
      console.log("checkhash");
      if (!lastHash) {
        // 如果没有 lastHash 说明没有上一次的编译结果，说明就是第一次渲染
        lastHash = currentHash;
        console.log("lastHash", lastHash, "currentHash", currentHash);
        return;
      }
      console.log("lastHash", lastHash, "currentHash", currentHash);
      // 调用 hot.check 方法向服务器检查更新并且拉取最新的代码
      module.hot.check();
    });
  },
});
