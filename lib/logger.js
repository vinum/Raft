var events = require('events')
var util = require('util')

var ansi = require('ansi')

var log = exports = module.exports = function() {

	events.EventEmitter.call(this);

	// by default, let ansi decide based on tty-ness.
	this.colorEnabled = undefined
	this._buffer = []

	this.id = 0
	this.record = []
	this.maxRecordSize = 10000
	this.cursor = ansi(process.stderr)
	this.stream = process.stderr
	// default level
	this.level = 'info'

	this.prefixStyle = {
		fg : 'magenta'
	}
	this.headingStyle = {
		fg : 'white',
		bg : 'black'
	}

	this.style = {}
	this.levels = {}
	this.disp = {}
	this.addLevel('silly', -Infinity, {
		inverse : true
	}, 'sill')
	this.addLevel('verbose', 1000, {
		fg : 'blue',
		bg : 'black'
	}, 'verb')
	this.addLevel('info', 2000, {
		fg : 'green'
	})
	this.addLevel('http', 3000, {
		fg : 'green',
		bg : 'black'
	})
	this.addLevel('warn', 4000, {
		fg : 'black',
		bg : 'red'
	}, 'WARN')
	this.addLevel('error', 5000, {
		fg : 'red',
		bg : 'black'
	}, 'ERR!')
	this.addLevel('silent', Infinity)

}
util.inherits(log, events.EventEmitter);

log.prototype.enableColor = function() {
	colorEnabled = true
	this.cursor.enabled = true
}
log.prototype.disableColor = function() {
	colorEnabled = false
	this.cursor.enabled = false
}
// temporarily stop emitting, but don't drop
log.prototype.pause = function() {
	this._paused = true
}

log.prototype.resume = function() {
	if (!this._paused)
		return this._paused = false

	var b = this._buffer
	this._buffer = []
	b.forEach(function(m) {
		this.emitLog(m)
	}, this)
}

log.prototype.log = function(lvl, prefix, message) {
	var l = this.levels[lvl]
	if (l === undefined) {
		return this.emit('error', new Error(util.format('Undefined log level: %j', lvl)))
	}

	var a = new Array(arguments.length - 2)
	var stack = null
	for (var i = 2; i < arguments.length; i++) {
		var arg = a[i - 2] = arguments[i]

		// resolve stack traces to a plain string.
		if ( typeof arg === 'object' && arg && ( arg instanceof Error) && arg.stack) {
			arg.stack = stack = arg.stack + ''
		}
	}
	if (stack)
		a.unshift(stack + '\n')
	message = util.format.apply(util, a)

	var m = {
		id : this.id++,
		level : lvl,
		prefix : String(prefix || ''),
		message : message,
		messageRaw : a
	}

	this.emit('log', m)
	this.emit('log' + lvl, m)
	if (m.prefix)
		this.emit(m.prefix, m)

	this.record.push(m)
	var mrs = this.maxRecordSize
	var n = this.record.length - mrs
	if (n > mrs / 10) {
		var newSize = Math.floor(mrs * 0.9)
		this.record = this.record.slice(-1 * newSize)
	}

	this.emitLog(m)
}

log.prototype.emitLog = function(m) {
	if (this._paused) {
		this._buffer.push(m)
		return
	}
	var l = this.levels[m.level]
	if (l === undefined)
		return
	if (l < this.levels[this.level])
		return
	if (l > 0 && !isFinite(l))
		return

	var style = this.style[m.level]
	var disp = this.disp[m.level] || m.level
	m.message.split(/\r?\n/).forEach(function(line) {
		if (this.heading) {
			this.write(this.heading, this.headingStyle)
			this.write(' ')
		}
		this.write(disp, this.style[m.level])
		var p = m.prefix || ''
		if (p)
			this.write(' ')
		this.write(p, this.prefixStyle)
		this.write(' ' + line + '\n')
	}, this)
}

log.prototype.write = function(msg, style) {
	if (!this.cursor)
		return
	if (this.stream !== this.cursor.stream) {
		this.cursor = ansi(this.stream, {
			enabled : this.colorEnabled
		})
	}

	this.style = this.style || {}
	if (this.style.fg)
		this.cursor.fg[this.style.fg]()
	if (this.style.bg)
		this.cursor.bg[this.style.bg]()
	if (this.style.bold)
		this.cursor.bold()
	if (this.style.underline)
		this.cursor.underline()
	if (this.style.inverse)
		this.cursor.inverse()
	if (this.style.beep)
		this.cursor.beep()
	this.cursor.write(msg).reset()
}

log.prototype.addLevel = function(lvl, n, style, disp) {
	if (!disp)
		disp = lvl
	this.levels[lvl] = n
	this.style[lvl] = style
	if (!this[lvl])
		this[lvl] = function() {
			var a = new Array(arguments.length + 1)
			a[0] = lvl
			for (var i = 0; i < arguments.length; i++) {
				a[i + 1] = arguments[i]
			}
			console.log(a)
			return this.log.apply(this, a)
		}
	this.disp[lvl] = disp
}
