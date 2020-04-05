/*!
* whif - promises A+
* @licence MIT
*/

/**
 * helper functions
 */
function id (any) {
  return any
}

function cancel (err) {
  throw err
}

var objectTypes = { 'object': true, 'function': true }

function isPrimitive (any) {
  return any == null || objectTypes[typeof any] !== true
}

function isFunction (any) {
  return typeof any === 'function' && typeof any.call === 'function'
}

function forEach (arr, fn) {
  for (var len = arr.length, i = -1; ++i < len;) fn(arr[i], i)
}

/**
 * promise states
 */
var PENDING = -1
var REJECTED = 0
var FULFILLED = 1

/**
 * promise class
 */
function whif (then) {
  if (!(this instanceof whif)) return new whif(then)

  this._state = PENDING
  this._queue = []
  this._sync = false

  if (isFunction(then)) {
    var that = this
    then(
      function (value) { that._resolve(value) },
      function (reason) { that._reject(reason) }
    )
  }
}

whif.prototype = {

  then: function (resolve, reject) {
    var successor = new whif()

    this._queue.push({
      resolve: isFunction(resolve) ? resolve : id,
      reject: isFunction(reject) ? reject : cancel,
      successor: successor
    })

    this._run()

    return successor
  },

  fail: function (reject) {
    return this.then(null, reject)
  },

  sync: function () {
    this._sync = true
    return this
  },

  /** 
   * - if this is to be resolved with itself - throw an error
   * - if `value` is another one of ours, adopt its `_state` if it
   *   is no longer `PENDING` or else prolong state adoption with `.then()`.
   * - if `value` is _thenable_ i.e. has a `.then()` method assume it's a promise.
   *   register this whif as `value`'s successor.
   * - resolve/reject this whif with `value` value otherwise
   */
  _resolve: function (value) {
    var that = this
    var called = false

    function onResolved(value) {
      if (!called) {
        called = true
        that._resolve(value)
      }
    }

    function onRejected(reason) {
      if (!called) {
        called = true
        that._adopt(REJECTED, reason)
      }
    }

    if (that === value) {
      onRejected(new TypeError())
    }
    else if (isPrimitive(value)) {
      that._adopt(FULFILLED, value)
    }
    else if (value instanceof whif) {
      
      if (value._state === PENDING) {
        value.then(onResolved, onRejected)
      }
      else {
        that._adopt(value._state, value._value)
      }
    }
    else {
      try {
        // must remain
        var then = value.then
        
        if (isFunction(then)) {
          then.call(value, onResolved, onRejected)
        }
        else {
          that._adopt(FULFILLED, value)
        }
      }
      catch (reason) {
        onRejected(reason)
      }
    }

    return that
  },

  _reject: function (reason) {
    this._adopt(REJECTED, reason)
    return this
  },

  _adopt: function (nextState, value) {
    if (this._state === PENDING) {
      this._state = nextState
      this._value = value
      this._run()
    }
  },

  _run: function () {
    if (this._state === PENDING) return

    var that = this
    function run () {
      while (that._queue.length) {
        var task = that._queue.shift()
        var value
        
        try {
          value = (that._state === FULFILLED ? task.resolve : task.reject)(that._value)
        }
        catch (reason) {
          task.successor._reject(reason)
          continue
        }

        task.successor._resolve(value)
      }
    }

    if (this._sync) run()
    else whif.nextTick(run)
  }
}

whif.resolve = function (value) {
  return new whif()._resolve(value)
}

whif.reject = function (reason) {
  return new whif()._reject(reason)
}

/**
 * whif.nextTick
 * 
 * @see [WebReflection](https://gist.github.com/WebReflection/2953527)
 */
whif.nextTick = (function () {
  var owner =
    typeof process !== 'undefined' ? process :
    typeof window !== 'undefined' ? window : this
  var vendorPrefixes = 'webkitR,mozR,msR,oR,r'.split(',')
  var nextTick = owner.nextTick || owner.setImmediate
       
  while (!nextTick && vendorPrefixes.length) {
    nextTick = owner[vendorPrefixes.pop() + 'equestAnimationFrame']
  }
   
  if (!nextTick && window.postMessage && window.addEventListener){
    var queue = []
     
    window.addEventListener('message', function (event) {
      var source = event.source
       
      if ((source == window || source == null) && event.data === 'nextTick') {
        event.stopPropagation()
        if (queue.length) queue.shift()()
      }
    }, true)
     
    nextTick = function (func) {
      queue.push(func)
      window.postMessage('nextTick', '*')
    };
  }
   
  nextTick = nextTick || setTimeout
   
  return function () {
    return nextTick.apply(owner, arguments)
  }
}())

/**
 * whif.join
 * 
 * - join whifs and resolve when all are resolved,
 *   reject as soon as one is rejected
 * - resolve each passed item and proxy its future value
 *   or the item _as is_ to the master's values array.
 */   
whif.join = function (args) {

  return new whif(function (resolve, reject) {
    var len = args.length
    if(!len) return resolve(args)

    var values = new Array(len)
    forEach(args, function (value, i) {
      
      whif.resolve(value).sync().then(function (value) {
        values[i] = value
        if (!--len) resolve(values)
      }, reject)
    })
  })
}

module.exports = whif
