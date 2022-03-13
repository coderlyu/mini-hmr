const input = document.createElement('input')
const p = document.createElement('p')
document.body.appendChild(input)
document.body.appendChild(p)

const render = function() {
    let title = require('./title.js')
    p.innerHTML = title
}
render()
if (module.hot) {
    module.hot.accept('./title.js', render)
}