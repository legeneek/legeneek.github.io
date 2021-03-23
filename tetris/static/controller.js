const boxState = {
  filled: 1,
  empty: 0
}
const rowLen = 25
const colLen = 15
const buffer = 5
const interval = 800
let fullLine = ''

for (let i = 0; i < colLen; ++i) {
  fullLine += boxState.filled
}

function cloneMetrix(s) {
  let res = []
  s.map((a) => {
    res.push(a.map((b) => {
      return b ? Object.assign({}, b) : b
    }))
  })
  return res
}

function flatArray(arr) {
  let res = []

  if (Array.isArray(arr)) {
    for (let i = 0, len = arr.length; i < len; ++i) {
      res = res.concat(flatArray(arr[i]))
    }
  } else if (arr != null) {
    res = res.concat(arr)
  }

  return res
}

class Shape {
  constructor() {
    this.shapes = [
      () => [
        [null, 1, null],
        [null, 1, 1],
        [null, 1, null]
      ],
      () => [
        [null, 1, 1],
        [1, 1, null],
        [null, null, null]
      ],
      () => [
        [1, 1, null],
        [null, 1, 1],
        [null, null, null]
      ],
      () => [
        [1, 1],
        [1, 1]
      ],
      () => [
        [null, null, 1, null, null],
        [null, null, 1, null, null],
        [null, null, 1, null, null],
        [null, null, 1, null, null],
        [null, null, 1, null, null]
      ],
      () => [
        [1, null, null],
        [1, null, null],
        [1, 1, null]
      ],
      () => [
        [null, 1, null],
        [null, 1, null],
        [1, 1, null]
      ]
    ]
  }
  stateToPoint(matrix) {
    const l = matrix.length
    let startX = Math.floor((colLen - l) / 2)
    let startY = buffer - l
    for (let i = 0; i < l; ++i) {
      for (let j = 0; j < l; ++j) {
        if (matrix[i][j] === boxState.filled) {
          matrix[i][j] = {
            x: startX + j,
            y: startY + i
          }
        }
      }
    }
    return matrix
  }
  getRandomShape() {
    return this.stateToPoint(
      this.shapes[Math.floor(this.shapes.length * Math.random())]()
      )
  }
}

class Tetris {
  constructor() {
    let arr = []
    for (let i = 0; i < rowLen; ++i) {
      let col = []
      for (let j = 0; j < colLen; ++j) {
        col.push(boxState.empty)
      }
      arr.push(col)
    }
    this.shape = new Shape()
    this.state = arr
    this.timer = null
    this.handlers = {}
    this._activeShape = null
    this.paused = false
    this.stoped = false
    this.newShape = true
  }
  get activeShape() {
    const s = flatArray(this._activeShape)
    return s.length ? s : null
  }
  set activeShape(s) {
    this._activeShape = s
  }
  start() {
    const me = this
    function loop() {
      me.timer = setTimeout(loop, interval)

      if (me.paused || me.stoped) {
        return
      }

      if (me.newShape) {
        me.newShape = false
        me.addShape()
      }
      
      if (!me.move('down')) {
        me.checkLines()
        me.newShape = true
        me.activeShape = null
      }
    }
    loop()
  }
  checkLines() {
    this.pause()
    let o = {}
    this.activeShape.map((d) => {
      return o[d.y] = 1
    })
    let arr = Object.keys(o).sort()
    for (let i = 0, l = arr.length; i < l; ++i) {
      let y = +arr[i]
      if (this.state[y].join('') === fullLine) {
        this.state.splice(y, 1)
        let newLine = []
        for (let j = 0; j < colLen; ++j) {
          newLine.push(boxState.empty)
        }
        this.state.unshift(newLine)
      }
    }
    this.emit('state')
    this.resume()
  }
  pause() {
    this.paused = true
  }
  resume() {
    this.paused = false
  }
  stop() {
    this.stoped = true
    this.emit('over')
    clearTimeout(this.timer)
  }
  move(dir) {
    if (this.paused || this.stoped || !this.activeShape) {
      return
    }

    let moved = false
    this.cleanShape(this.activeShape)
    let cloneShape = cloneMetrix(this._activeShape)

    if (dir === 'down') {
      for (let j = 0; j < this.activeShape.length; ++j) {
        let dot = this.activeShape[j]
        dot.y += 1
      }
    } else if (dir === 'left') {
      for (let m = 0; m < this.activeShape.length; ++m) {
        let dot = this.activeShape[m]
        dot.x -= 1
      }
    } else if (dir === 'right') {
      for (let n = 0; n < this.activeShape.length; ++n) {
        let dot = this.activeShape[n]
        dot.x += 1
      }
    }

    if (this.canDrawShape(this.activeShape)) {
      moved = true
    } else {
      this.activeShape = cloneShape
    }
    this.drawShape(this.activeShape)

    this.emit('state')

    return moved
  }
  getNextShape() {
    return this.shape.getRandomShape()
  }
  transformShape() {
    if (!this._activeShape) {
      return
    }
    
    let len = this._activeShape.length
    let res = []
    let p
    for (let i = 0; i < len; ++i) {
      let r = []
      for (let j = 0; j < len; ++j) {
        r.push(null)
      }
      res.push(r)
    }

    for (let m = 0; m < len; ++m) {
      for (let n = 0; n < len; ++n) {
        let dot = this._activeShape[m] ? this._activeShape[m][n] : null
        if (dot) {
          p = Object.assign({}, dot)
          p.x += len - 1 - m - n
          p.y += n - m
          res[n][len - 1 - m] = p
        }
      }
    }

    this.cleanShape(this.activeShape)
    let flatten = flatArray(res)
    if (this.canDrawShape(flatten)) {
      this.activeShape = res
      this.drawShape(flatten)
    } else {
      this.drawShape(this.activeShape)
    }

    this.emit('state')
  }
  cleanShape (s) {
    for (let i = 0, len = s.length; i < len; ++i) {
      let dot = s[i]
      this.state[dot.y][dot.x] = boxState.empty
    }
  }
  drawShape (s) {
    for (let i = 0, len = s.length; i < len; ++i) {
      let dot = s[i]
      this.state[dot.y][dot.x] = boxState.filled
    }
  }
  canDrawShape(s) {
    for (let i = 0, len = s.length; i < len; ++i) {
      let dot = s[i]
      if (dot.y >= rowLen || dot.y < 0 || dot.x >= colLen || dot.x < 0 || 
        this.state[dot.y][dot.x] === boxState.filled) {
        return false
      }
    }
    return true
  }
  addShape() {
    this.activeShape = this.getNextShape()
    if (!this.canDrawShape(this.activeShape)) {
      this.stop()
      return
    }
    this.drawShape(this.activeShape)
    this.emit('state')
  }
  emit(msg) {
    if (msg === 'state') {
      self.postMessage({type: 'state', data: JSON.stringify(this.state)})
    }
  }
}

const tetris = new Tetris()

self.addEventListener('message', (e) => {
  let d = e.data
  if (d.cmd === 'start') {
    tetris.start()
  } else if (d.cmd === 'pause') {
    tetris.pause()
  } else if (d.cmd === 'resume') {
    tetris.resume()
  } else if (d.cmd === 'move') {
    tetris.move(d.data)
  } else if (d.cmd === 'transform') {
    tetris.transformShape()
  }
})